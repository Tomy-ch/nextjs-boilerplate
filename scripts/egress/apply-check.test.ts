import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { rewriteHarden, runEgress, WORKFLOW_DIR, workflowNames } from "./apply-check";
import { type Declaration, parseDeclaration } from "./declaration";

const HARDEN = [
  "jobs:",
  "  lint:",
  "    steps:",
  "      - name: Harden the runner",
  "        uses: step-security/harden-runner@bf7454d0 # v2.20.0",
  "        with:",
  "          egress-policy: audit",
  "",
  "      - name: Checkout",
  "        uses: actions/checkout@9c091bb2 # v7.0.0",
  "",
].join("\n");

const DECLARATION: Declaration = parseDeclaration(
  [
    "baseline:",
    "  - github.com:443",
    "workflows:",
    "  vrt:",
    "    - mcr.microsoft.com:443",
    "audit:",
    "  notify: 実行の記録がまだ無い",
  ].join("\n"),
);

let root: string;

/** workflow を 1 本置く。 */
function place(name: string, content = HARDEN): void {
  writeFileSync(join(root, WORKFLOW_DIR, `${name}.yaml`), content);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "egress-apply-"));
  mkdirSync(join(root, WORKFLOW_DIR), { recursive: true });
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe("WORKFLOW_DIR", () => {
  // ----- 正常系 -----
  it("走査する範囲をリポジトリ相対で示す", () => {
    expect(WORKFLOW_DIR).toBe(".github/workflows");
  });
});

describe("rewriteHarden", () => {
  // ----- 正常系 -----
  it("宛先を許可リストとして並べ、遮断へ倒す", () => {
    const { out, malformed } = rewriteHarden(HARDEN, ["github.com:443", "api.github.com:443"]);

    expect(malformed).toEqual([]);
    expect(out).toContain("          egress-policy: block\n");
    expect(out).toContain("          allowed-endpoints: >\n            github.com:443\n");
    expect(out).toContain("            api.github.com:443\n");
  });

  it("周りの行を動かさない", () => {
    const { out } = rewriteHarden(HARDEN, ["github.com:443"]);

    expect(out).toContain("      - name: Checkout\n");
    expect(out).toContain("        uses: actions/checkout@9c091bb2 # v7.0.0");
  });

  it("既にある許可リストを積み増さずに置き換える", () => {
    const first = rewriteHarden(HARDEN, ["github.com:443", "api.github.com:443"]).out;
    const second = rewriteHarden(first, ["github.com:443"]).out;

    expect(second).toContain("            github.com:443\n");
    expect(second).not.toContain("api.github.com:443");
  });

  it("同じ宣言を二度当てても結果が変わらない", () => {
    const once = rewriteHarden(HARDEN, ["github.com:443"]).out;

    expect(rewriteHarden(once, ["github.com:443"]).out).toBe(once);
  });

  it("harden-runner が複数あればすべて書き換える", () => {
    const { out } = rewriteHarden(`${HARDEN}${HARDEN}`, ["github.com:443"]);

    expect(out.match(/egress-policy: block/g)).toHaveLength(2);
  });

  it("harden-runner が無ければ何も変えない", () => {
    const plain = "jobs:\n  lint:\n    steps:\n      - run: echo hi\n";

    expect(rewriteHarden(plain, ["github.com:443"]).out).toBe(plain);
  });

  // ----- 異常系 -----
  it("監査のままにするなら許可リストを書かない", () => {
    const { out } = rewriteHarden(HARDEN, null);

    expect(out).toContain("          egress-policy: audit\n");
    expect(out).not.toContain("allowed-endpoints");
  });

  it("遮断から監査へ戻すと許可リストが消える", () => {
    const blocked = rewriteHarden(HARDEN, ["github.com:443"]).out;
    const { out } = rewriteHarden(blocked, null);

    expect(out).not.toContain("allowed-endpoints");
    expect(out).toContain("          egress-policy: audit\n");
  });

  it("with が続かない形は書き換えず、行番号を挙げる", () => {
    const odd = "        uses: step-security/harden-runner@bf7454d0 # v2.20.0\n        run: echo\n";
    const { out, malformed } = rewriteHarden(odd, ["github.com:443"]);

    expect(malformed).toEqual([1]);
    expect(out).toBe(odd);
  });

  it("行が続かずに終わる形も書き換えない", () => {
    const odd = "        uses: step-security/harden-runner@bf7454d0 # v2.20.0";
    const { out, malformed } = rewriteHarden(odd, ["github.com:443"]);

    expect(malformed).toEqual([1]);
    expect(out).toBe(odd);
  });

  it("egress-policy が続かない形も書き換えない", () => {
    const odd = [
      "        uses: step-security/harden-runner@bf7454d0 # v2.20.0",
      "        with:",
      "          disable-sudo: true",
      "",
    ].join("\n");
    const { out, malformed } = rewriteHarden(odd, ["github.com:443"]);

    expect(malformed).toEqual([1]);
    expect(out).toBe(odd);
  });
});

describe("workflowNames", () => {
  // ----- 正常系 -----
  it("拡張子を外した名前を並べる", () => {
    place("vrt");
    place("lint");

    expect(workflowNames(root)).toEqual(["lint", "vrt"]);
  });

  // ----- 異常系 -----
  it("yaml 以外は数えない", () => {
    place("vrt");
    writeFileSync(join(root, WORKFLOW_DIR, "README.md"), "# not a workflow");

    expect(workflowNames(root)).toEqual(["vrt"]);
  });
});

describe("runEgress", () => {
  // ----- 正常系 -----
  it("固有分を持つ workflow にはそれを足して書き込む", () => {
    place("vrt");

    const report = runEgress(root, DECLARATION, false);

    expect(report.updated).toEqual([`${WORKFLOW_DIR}/vrt.yaml`]);
    expect(readFileSync(join(root, WORKFLOW_DIR, "vrt.yaml"), "utf8")).toContain(
      "            mcr.microsoft.com:443",
    );
  });

  it("固定済みなら書き込まない", () => {
    place("lint");
    runEgress(root, DECLARATION, false);

    expect(runEgress(root, DECLARATION, false).updated).toEqual([]);
  });

  it("監査のままと宣言された workflow はそのまま残し、名前を挙げる", () => {
    place("notify");

    const report = runEgress(root, DECLARATION, false);

    expect(report.audited).toEqual(["notify"]);
    expect(readFileSync(join(root, WORKFLOW_DIR, "notify.yaml"), "utf8")).toContain(
      "egress-policy: audit",
    );
  });

  it("読み書きできる権限で書き出す", () => {
    place("lint");
    runEgress(root, DECLARATION, false);

    expect(statSync(join(root, WORKFLOW_DIR, "lint.yaml")).mode & 0o777).toBe(0o644);
  });

  // ----- 異常系 -----
  it("dry run では書かずに食い違いだけを挙げる", () => {
    place("lint");

    const report = runEgress(root, DECLARATION, true);

    expect(report.drifted).toEqual([`${WORKFLOW_DIR}/lint.yaml`]);
    expect(report.updated).toEqual([]);
    expect(readFileSync(join(root, WORKFLOW_DIR, "lint.yaml"), "utf8")).toContain(
      "egress-policy: audit",
    );
  });

  it("想定の外にある形は位置を添えて挙げる", () => {
    place(
      "odd",
      "        uses: step-security/harden-runner@bf7454d0 # v2.20.0\n        run: echo\n",
    );

    expect(runEgress(root, DECLARATION, true).malformed).toEqual([`${WORKFLOW_DIR}/odd.yaml:1`]);
  });
});
