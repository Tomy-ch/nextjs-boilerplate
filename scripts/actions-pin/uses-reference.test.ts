import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  type ActionRef,
  collectRefs,
  parseUses,
  refKey,
  refPath,
  targetFiles,
  USES_PATTERN,
  unparsedUsesLines,
} from "./uses-reference";

let root: string;

/** `<root>/<relativePath>` へ親ディレクトリごとファイルを置き、絶対パスを返す。 */
function place(relativePath: string, content: string): string {
  const target = join(root, relativePath);
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(target, content);

  return target;
}

const ref = (repo: string, sub: string, tag: string): ActionRef => ({ repo, sub, tag });

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "uses-reference-"));
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe("refKey", () => {
  // ----- 正常系 -----
  it("repo と版でキーを作り、サブパスを含めない", () => {
    expect(refKey(ref("github/codeql-action", "init", "v4"))).toBe("github/codeql-action@v4");
  });
});

describe("refPath", () => {
  // ----- 正常系 -----
  it("サブパスを持つ参照を owner/repo/sub へ復元する", () => {
    expect(refPath(ref("github/codeql-action", "init", "v4"))).toBe("github/codeql-action/init");
  });

  it("サブパスを持たない参照は repo をそのまま返す", () => {
    expect(refPath(ref("actions/checkout", "", "v7"))).toBe("actions/checkout");
  });
});

describe("parseUses", () => {
  // ----- 正常系 -----
  it("owner/repo と版から参照を組み立てる", () => {
    expect(parseUses("actions/checkout", "v7", undefined)).toEqual(
      ref("actions/checkout", "", "v7"),
    );
  });

  it("サブパスを sub へ分ける", () => {
    expect(parseUses("github/codeql-action/init", "v4", undefined)).toEqual(
      ref("github/codeql-action", "init", "v4"),
    );
  });

  it("固定済みの行では末尾コメントの版を採る", () => {
    expect(parseUses("actions/checkout", "9c091bb", "v7.0.0")).toEqual(
      ref("actions/checkout", "", "v7.0.0"),
    );
  });

  // ----- 異常系 -----
  it("ローカル参照を固定対象外にする", () => {
    expect(parseUses("./.github/actions/setup", "", undefined)).toBeNull();
  });

  it("owner/repo の形を成さない参照を固定対象外にする", () => {
    expect(parseUses("checkout", "v7", undefined)).toBeNull();
  });

  it("空のコメントは版として採らず ref 側を使う", () => {
    expect(parseUses("actions/checkout", "v7", "")).toEqual(ref("actions/checkout", "", "v7"));
  });
});

describe("USES_PATTERN", () => {
  // ----- 正常系 -----
  it("ブロック記法の uses 行から path・ref・コメントを取り出す", () => {
    USES_PATTERN.lastIndex = 0;
    const matches = [..."      - uses: actions/checkout@9c091bb # v7.0.0\n".matchAll(USES_PATTERN)];

    expect(matches).toHaveLength(1);
    expect(matches[0]?.slice(2, 5)).toEqual(["actions/checkout", "9c091bb", "v7.0.0"]);
  });

  // ----- 異常系 -----
  it("複数行を 1 つのマッチへ結合しない", () => {
    USES_PATTERN.lastIndex = 0;
    const source = "      - uses: actions/checkout@v7\n      - uses: actions/cache@v6\n";

    expect([...source.matchAll(USES_PATTERN)]).toHaveLength(2);
  });
});

describe("targetFiles", () => {
  // ----- 正常系 -----
  it("workflow 定義と composite action 定義を名前順で集める", () => {
    place(".github/workflows/test.yaml", "");
    place(".github/workflows/lint.yml", "");
    place(".github/actions/setup/action.yml", "");

    expect(targetFiles(root)).toEqual(
      [
        join(root, ".github", "actions", "setup", "action.yml"),
        join(root, ".github", "workflows", "lint.yml"),
        join(root, ".github", "workflows", "test.yaml"),
      ].sort(),
    );
  });

  // ----- 異常系 -----
  it("workflow ディレクトリの YAML 以外を集めない", () => {
    place(".github/workflows/README.md", "");

    expect(targetFiles(root)).toEqual([]);
  });

  it("対象ディレクトリが無くても空を返す", () => {
    expect(targetFiles(root)).toEqual([]);
  });
});

describe("collectRefs", () => {
  // ----- 正常系 -----
  it("複数ファイルの参照をキー単位で集める", () => {
    const a = place("a.yaml", "      - uses: actions/checkout@v7\n");
    const b = place("b.yaml", "      - uses: actions/cache@v6\n");

    expect([...collectRefs([a, b]).keys()].sort()).toEqual([
      "actions/cache@v6",
      "actions/checkout@v7",
    ]);
  });

  it("同一キーが複数箇所に現れても 1 件に畳む", () => {
    const file = place(
      "a.yaml",
      "      - uses: actions/checkout@v7\n      - uses: actions/checkout@v7\n",
    );

    expect(collectRefs([file]).size).toBe(1);
  });

  // ----- 異常系 -----
  it("固定対象外の参照を集めない", () => {
    const file = place("a.yaml", "      - uses: ./.github/actions/setup\n");

    expect(collectRefs([file]).size).toBe(0);
  });
});

describe("unparsedUsesLines", () => {
  // ----- 正常系 -----
  it("解釈できたブロック記法の行を取りこぼしとして数えない", () => {
    expect(unparsedUsesLines("      - uses: actions/checkout@v7\n")).toEqual([]);
  });

  // ----- 異常系 -----
  it("flow mapping で書かれた uses を取りこぼしとして返す", () => {
    const source = "steps:\n  - {name: X, uses: actions/checkout@v7}\n";

    expect(unparsedUsesLines(source)).toEqual([2]);
  });

  it("引用符付きで書かれた uses を取りこぼしとして返す", () => {
    expect(unparsedUsesLines('    uses: "actions/checkout@v7"\n')).toEqual([1]);
  });

  it("行全体がコメントなら取りこぼしとして扱わない", () => {
    expect(unparsedUsesLines("  # uses: actions/checkout@v7\n")).toEqual([]);
  });

  it("ローカル参照を取りこぼしとして扱わない", () => {
    expect(unparsedUsesLines("  - {uses: ./.github/actions/setup}\n")).toEqual([]);
  });

  it("版を持たない参照を取りこぼしとして扱わない", () => {
    expect(unparsedUsesLines("  - {uses: actions/checkout}\n")).toEqual([]);
  });
});
