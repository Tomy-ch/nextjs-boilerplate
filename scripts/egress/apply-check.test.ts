import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { rewriteStep, runEgress, WORKFLOW_DIR, workflowNames } from "./apply-check";
import { policyBlock, type StepPolicy } from "./bullfrog-step";
import { type Declaration, parseDeclaration } from "./declaration";

const INDENT = "        ";

const AUDIT_WITH = [`${INDENT}with:`, `${INDENT}  egress-policy: audit`];

/** job 1 つ分の bullfrog の step と、その後ろの checkout。 */
function step(job: string, withLines: readonly string[] = AUDIT_WITH): string {
  return [
    `  ${job}:`,
    "    steps:",
    "      - name: Harden the runner",
    `${INDENT}uses: bullfrogsec/bullfrog@7dee337d # v0.11.1`,
    ...withLines,
    "",
    "      - name: Checkout",
    `${INDENT}uses: actions/checkout@9c091bb2 # v7.0.0`,
    "",
  ].join("\n");
}

/** 方針を当てた後にあるべき step。`with:` の中身は policyBlock が持つ。 */
function applied(job: string, policy: StepPolicy): string {
  return step(job, policyBlock(INDENT, policy));
}

const HEADER = "name: Lint\non: push\n";

const BULLFROG = `${HEADER}jobs:\n${step("lint")}`;

/** BULLFROG へ方針を当てた後にあるべき中身。 */
function lintWith(policy: StepPolicy): string {
  return `${HEADER}jobs:\n${applied("lint", policy)}`;
}

const BLOCK: StepPolicy = { domains: ["github.com", "api.github.com"], ips: [], sudo: false };

const AUDIT: StepPolicy = { domains: null, ips: ["127.0.0.100"], sudo: false };

/** DECLARATION が vrt に当てる方針（sudo を除く）。 */
const VRT = { domains: ["github.com", "mcr.microsoft.com"], ips: ["127.0.0.100"] };

const DECLARATION: Declaration = parseDeclaration(
  [
    "baseline:",
    "  - github.com",
    "ips:",
    "  '127.0.0.100': ローカルの DNS 転送役",
    "workflows:",
    "  vrt:",
    "    - mcr.microsoft.com",
    "audit:",
    "  notify: 実行の記録がまだ無い",
    "sudo:",
    "  vrt:",
    "    capture: ホストのパスをマウントする",
  ].join("\n"),
);

let root: string;

/** workflow を 1 本置く。 */
function place(name: string, content = BULLFROG): void {
  writeFileSync(join(root, WORKFLOW_DIR, `${name}.yaml`), content);
}

function read(name: string): string {
  return readFileSync(join(root, WORKFLOW_DIR, `${name}.yaml`), "utf8");
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

describe("rewriteStep", () => {
  // ----- 正常系 -----
  it("step の with を policyBlock の出力へ差し替え、周りの行を動かさない", () => {
    const { out, malformed, jobs, missing } = rewriteStep(BULLFROG, () => BLOCK);

    expect(out).toBe(lintWith(BLOCK));
    expect(malformed).toEqual([]);
    expect(jobs).toEqual(["lint"]);
    expect(missing).toEqual([]);
  });

  it("監査のままの方針も同じ位置へ差し替える", () => {
    expect(rewriteStep(BULLFROG, () => AUDIT).out).toBe(lintWith(AUDIT));
  });

  it("遮断から監査へ戻すと、遮断の入力を残さない", () => {
    const blocked = rewriteStep(BULLFROG, () => BLOCK).out;

    expect(rewriteStep(blocked, () => AUDIT).out).toBe(lintWith(AUDIT));
  });

  it("step が属する job の名前で方針を引き、見つけた job を返す", () => {
    const data = `${HEADER}jobs:\n${step("lint")}${step("capture")}`;
    const policyOf = (job: string): StepPolicy => ({ ...BLOCK, sudo: job === "capture" });
    const { out, jobs } = rewriteStep(data, policyOf);

    expect(jobs).toEqual(["lint", "capture"]);
    const lint = applied("lint", policyOf("lint"));
    const capture = applied("capture", policyOf("capture"));

    expect(out).toBe(`${HEADER}jobs:\n${lint}${capture}`);
  });

  it("1 つの job に bullfrog が 2 つあれば、その job を 2 度挙げる", () => {
    const twice = step("lint").split("\n").slice(2).join("\n");
    const data = `jobs:\n${step("lint")}${twice}`;

    expect(rewriteStep(data, () => BLOCK).jobs).toEqual(["lint", "lint"]);
  });

  it("既にある with の中身を積み増さずに置き換える", () => {
    const first = rewriteStep(BULLFROG, () => ({ ...BLOCK, ips: ["127.0.0.100"] })).out;
    const narrow: StepPolicy = { ...BLOCK, domains: ["github.com"] };

    expect(rewriteStep(first, () => narrow).out).toBe(lintWith(narrow));
  });

  it("同じ方針を二度当てても結果が変わらない", () => {
    const once = rewriteStep(BULLFROG, () => BLOCK).out;

    expect(rewriteStep(once, () => BLOCK).out).toBe(once);
  });

  it("ファイルの末尾で終わる step も書き換える", () => {
    const uses = `${INDENT}uses: bullfrogsec/bullfrog@7dee337d # v0.11.1`;
    const tail = [uses, ...AUDIT_WITH].join("\n");

    const expected = [uses, ...policyBlock(INDENT, BLOCK)].join("\n");

    expect(rewriteStep(tail, () => BLOCK).out).toBe(expected);
  });

  it("再利用 workflow を呼ぶだけの job は bullfrog が無くても挙げない", () => {
    const notify = "  notify:\n    needs: lint\n    uses: ./.github/workflows/notify.yaml\n";

    expect(rewriteStep(`${BULLFROG}${notify}`, () => BLOCK).missing).toEqual([]);
  });

  it("job と steps のキーに後置コメントがあっても見分ける", () => {
    const data = "jobs: # 一覧\n  lint: # 検査\n    steps: # 手順\n      - run: echo hi\n";

    expect(rewriteStep(data, () => BLOCK).missing).toEqual(["lint"]);
  });

  // ----- 異常系 -----
  it("steps を持つのに bullfrog が無い job を、書き換えずに挙げる", () => {
    const plain = "jobs:\n  lint:\n    steps:\n      - run: echo hi\n";

    expect(rewriteStep(plain, () => BLOCK)).toEqual({
      out: plain,
      malformed: [],
      jobs: [],
      missing: ["lint"],
    });
  });

  it("jobs の外にある step を直前の job に帰属させない", () => {
    const orphan = step("x").split("\n").slice(1).join("\n");
    const data = `${HEADER}jobs:\n${step("lint")}env:\n  build:\n${orphan}`;

    expect(rewriteStep(data, () => BLOCK).jobs).toEqual(["lint", ""]);
  });

  it("bullfrog の無い job を、jobs の外へ出た時点で閉じて挙げる", () => {
    const orphan = step("x").split("\n").slice(2).join("\n");
    const data = `jobs:\n  test:\n    steps:\n      - run: echo hi\nenv:\n${orphan}`;
    const { missing, jobs } = rewriteStep(data, () => BLOCK);

    expect(missing).toEqual(["test"]);
    expect(jobs).toEqual([""]);
  });

  it("uses: で始まらない行に置いた bullfrog は形の外として挙げる", () => {
    const inline = [
      "jobs:",
      "  lint:",
      "    steps:",
      "      - uses: bullfrogsec/bullfrog@7dee337d # v0.11.1",
      "        with:",
      "          egress-policy: audit",
      "",
    ].join("\n");
    const { out, malformed, missing } = rewriteStep(inline, () => BLOCK);

    expect(malformed).toEqual([4]);
    expect(missing).toEqual([]);
    expect(out).toBe(inline);
  });

  it("bullfrog を名指すコメント行は数えず、step の代わりにもならない", () => {
    const commented = "jobs:\n  lint:\n    steps:\n      # bullfrogsec/bullfrog\n      - run: x\n";
    const { out, malformed, missing } = rewriteStep(commented, () => BLOCK);

    expect(malformed).toEqual([]);
    expect(missing).toEqual(["lint"]);
    expect(out).toBe(commented);
  });

  it("with が続かない形は書き換えず、行番号を挙げる", () => {
    const odd = `${INDENT}uses: bullfrogsec/bullfrog@7dee337d # v0.11.1\n${INDENT}run: echo\n`;
    const { out, malformed, jobs } = rewriteStep(odd, () => BLOCK);

    expect(malformed).toEqual([1]);
    expect(jobs).toEqual([]);
    expect(out).toBe(odd);
  });

  it("行が続かずに終わる形も書き換えない", () => {
    const odd = `${INDENT}uses: bullfrogsec/bullfrog@7dee337d # v0.11.1`;
    const { out, malformed } = rewriteStep(odd, () => BLOCK);

    expect(malformed).toEqual([1]);
    expect(out).toBe(odd);
  });

  it("with の後で行が尽きる形も書き換えない", () => {
    const odd = `${INDENT}uses: bullfrogsec/bullfrog@7dee337d # v0.11.1\n${INDENT}with:`;
    const { out, malformed } = rewriteStep(odd, () => BLOCK);

    expect(malformed).toEqual([1]);
    expect(out).toBe(odd);
  });

  it("egress-policy が続かない形も書き換えない", () => {
    const odd = [
      `${INDENT}uses: bullfrogsec/bullfrog@7dee337d # v0.11.1`,
      `${INDENT}with:`,
      `${INDENT}  enable-sudo: true`,
      "",
    ].join("\n");
    const { out, malformed } = rewriteStep(odd, () => BLOCK);

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
  it("固有分を持つ workflow にはそれを足し、全 job に IP を書き込む", () => {
    place("vrt");

    const report = runEgress(root, DECLARATION, false);

    expect(report.updated).toEqual([`${WORKFLOW_DIR}/vrt.yaml`]);
    expect(read("vrt")).toBe(lintWith({ ...VRT, sudo: false }));
  });

  it("sudo を残すと宣言された job にだけ enable-sudo: true を書く", () => {
    place("vrt", `${HEADER}jobs:\n${step("scope")}${step("capture")}`);

    const report = runEgress(root, DECLARATION, false);

    expect(report.jobs).toEqual(["vrt/scope", "vrt/capture"]);
    const scope = applied("scope", { ...VRT, sudo: false });
    const capture = applied("capture", { ...VRT, sudo: true });

    expect(read("vrt")).toBe(`${HEADER}jobs:\n${scope}${capture}`);
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
    expect(read("notify")).toBe(lintWith(AUDIT));
  });

  it("書き換えたファイルの権限を揃える", () => {
    place("lint");
    chmodSync(join(root, WORKFLOW_DIR, "lint.yaml"), 0o600);
    runEgress(root, DECLARATION, false);

    expect(statSync(join(root, WORKFLOW_DIR, "lint.yaml")).mode & 0o777).toBe(0o644);
  });

  // ----- 異常系 -----
  it("dry run では書かずに食い違いだけを挙げる", () => {
    place("lint");

    const report = runEgress(root, DECLARATION, true);

    expect(report.drifted).toEqual([`${WORKFLOW_DIR}/lint.yaml`]);
    expect(report.updated).toEqual([]);
    expect(read("lint")).toBe(BULLFROG);
  });

  it("dry run でも job・形の外・監査のままを挙げ、固定済みのファイルは食い違いにしない", () => {
    place("lint");
    runEgress(root, DECLARATION, false);
    place("vrt", `${HEADER}jobs:\n${step("capture")}`);
    place("notify");
    place("odd", `${INDENT}uses: bullfrogsec/bullfrog@7dee337d # v0.11.1\n${INDENT}run: echo\n`);

    const report = runEgress(root, DECLARATION, true);

    expect(report.drifted).toEqual([`${WORKFLOW_DIR}/notify.yaml`, `${WORKFLOW_DIR}/vrt.yaml`]);
    expect(report.jobs).toEqual(["lint/lint", "notify/lint", "vrt/capture"]);
    expect(report.malformed).toEqual([`${WORKFLOW_DIR}/odd.yaml:1`]);
    expect(report.audited).toEqual(["notify"]);
    expect(report.updated).toEqual([]);
  });

  it("bullfrog の無い job を workflow/job の形で挙げる", () => {
    place("lint", "jobs:\n  lint:\n    steps:\n      - run: echo hi\n");

    expect(runEgress(root, DECLARATION, true).missing).toEqual(["lint/lint"]);
  });
});
