import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyPins, rewritePins } from "./apply-check";

const SHA = "9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0";

let root: string;

/** `<root>/<relativePath>` へ親ディレクトリごとファイルを置き、絶対パスを返す。 */
function place(relativePath: string, content: string): string {
  const target = join(root, relativePath);
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(target, content);

  return target;
}

const lockOf = (...entries: [string, string][]): Map<string, string> => new Map(entries);

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "actions-pin-apply-"));
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe("rewritePins", () => {
  // ----- 正常系 -----
  it("uses を SHA へ固定し、版を末尾コメントへ残す", () => {
    const result = rewritePins(
      "      - uses: actions/checkout@v7\n",
      lockOf(["actions/checkout@v7", SHA]),
    );

    expect(result.out).toBe(`      - uses: actions/checkout@${SHA} # v7\n`);
    expect(result.referenced).toEqual(["actions/checkout@v7"]);
    expect(result.missing).toEqual([]);
  });

  it("サブパスを持つ参照を owner/repo/sub の形へ戻して固定する", () => {
    const result = rewritePins(
      "      - uses: github/codeql-action/init@v4\n",
      lockOf(["github/codeql-action@v4", SHA]),
    );

    expect(result.out).toBe(`      - uses: github/codeql-action/init@${SHA} # v4\n`);
  });

  it("固定済みの行を版そのままで書き直す", () => {
    const line = `      - uses: actions/checkout@${SHA} # v7.0.0\n`;

    expect(rewritePins(line, lockOf(["actions/checkout@v7.0.0", SHA])).out).toBe(line);
  });

  // ----- 異常系 -----
  it("ロックファイルに無い参照は書き換えず missing へ挙げる", () => {
    const line = "      - uses: actions/checkout@v7\n";
    const result = rewritePins(line, lockOf());

    expect(result.out).toBe(line);
    expect(result.missing).toEqual(["actions/checkout@v7"]);
  });

  it("固定対象外のローカル参照は書き換えず参照にも数えない", () => {
    const line = "      - uses: ./.github/actions/setup@v1\n";
    const result = rewritePins(line, lockOf());

    expect(result.out).toBe(line);
    expect(result.referenced).toEqual([]);
  });
});

describe("applyPins", () => {
  // ----- 正常系 -----
  it("dryRun では書き換えず、ずれたファイルを drifted へ挙げる", () => {
    const file = place("w.yaml", "      - uses: actions/checkout@v7\n");
    const report = applyPins(root, [file], lockOf(["actions/checkout@v7", SHA]), true);

    expect(report.drifted).toEqual(["w.yaml"]);
    expect(report.updated).toEqual([]);
    expect(readFileSync(file, "utf8")).toBe("      - uses: actions/checkout@v7\n");
  });

  it("dryRun でなければ書き換え、updated へ挙げる", () => {
    const file = place("w.yaml", "      - uses: actions/checkout@v7\n");
    const report = applyPins(root, [file], lockOf(["actions/checkout@v7", SHA]), false);

    expect(report.updated).toEqual(["w.yaml"]);
    expect(report.drifted).toEqual([]);
    expect(readFileSync(file, "utf8")).toBe(`      - uses: actions/checkout@${SHA} # v7\n`);
  });

  it("既に固定済みなら drifted にも updated にも挙げない", () => {
    const file = place("w.yaml", `      - uses: actions/checkout@${SHA} # v7\n`);
    const report = applyPins(root, [file], lockOf(["actions/checkout@v7", SHA]), true);

    expect(report.drifted).toEqual([]);
    expect(report.missing).toEqual([]);
  });

  // ----- 異常系 -----
  it("未登録の参照があれば書き込まずに missing を返す", () => {
    const file = place("w.yaml", "      - uses: actions/checkout@v7\n");
    const report = applyPins(root, [file], lockOf(), false);

    expect(report.missing).toEqual(["actions/checkout@v7"]);
    expect(report.updated).toEqual([]);
    expect(readFileSync(file, "utf8")).toBe("      - uses: actions/checkout@v7\n");
  });

  it("どの uses からも参照されないキーを orphans へ挙げる", () => {
    const file = place("w.yaml", "      - uses: actions/checkout@v7\n");
    const report = applyPins(
      root,
      [file],
      lockOf(["actions/checkout@v7", SHA], ["actions/cache@v6", SHA]),
      true,
    );

    expect(report.orphans).toEqual(["actions/cache@v6"]);
  });

  it("対応記法の外の uses を位置付きで unparsed へ挙げる", () => {
    const file = place("w.yaml", "steps:\n  - {uses: actions/checkout@v7}\n");
    const report = applyPins(root, [file], lockOf(["actions/checkout@v7", SHA]), true);

    expect(report.unparsed).toEqual(["w.yaml:2"]);
  });

  it("1 ファイルでも中断条件に当たれば、他のファイルも書き換えない", () => {
    const ok = place("a.yaml", "      - uses: actions/checkout@v7\n");
    const ng = place("b.yaml", "      - uses: actions/cache@v6\n");
    const report = applyPins(root, [ok, ng], lockOf(["actions/checkout@v7", SHA]), false);

    expect(report.missing).toEqual(["actions/cache@v6"]);
    expect(report.updated).toEqual([]);
    expect(readFileSync(ok, "utf8")).toBe("      - uses: actions/checkout@v7\n");
  });
});
