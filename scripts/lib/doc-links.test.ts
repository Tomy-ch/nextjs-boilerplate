import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { findBrokenDocLinks, formatBrokenDocLinks } from "./doc-links";

let root: string;

/** `<root>/<relativePath>` へ親ごとファイルを置く。 */
function place(relativePath: string, content = ""): void {
  const target = join(root, relativePath);
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(target, content);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "doc-links-"));
  place("docs/guide.md", "# 使い方\n\n## 置き場\n\n## 置き場\n\n## `cn()` の使い方\n");
  place("docs/logo.svg");
  mkdirSync(join(root, "docs/nested"), { recursive: true });
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe("findBrokenDocLinks", () => {
  // ----- 正常系 -----
  it("実在する文書を指すリンクは拾わない", () => {
    const source = "/** ([使い方](../docs/guide.md)) */";

    expect(findBrokenDocLinks("src/x.ts", source, root)).toEqual([]);
  });

  it("URL とルート絶対パスは相対リンクとして見ない", () => {
    const source = "/** [公式](https://example.test/a.md) [根](/docs/guide.md) */";

    expect(findBrokenDocLinks("src/x.ts", source, root)).toEqual([]);
  });

  it("`<>` で囲んだパスも解決する", () => {
    const source = "[使い方](<../docs/guide.md>)";

    expect(findBrokenDocLinks("src/x.md", source, root)).toEqual([]);
  });

  it("題名付きのリンクは、パスだけを見る", () => {
    const source = '[使い方](../docs/guide.md "手引き")';

    expect(findBrokenDocLinks("src/x.md", source, root)).toEqual([]);
  });

  it("指し先が持つ見出しへのアンカーは通す", () => {
    const source = "[置き場](../docs/guide.md#置き場)";

    expect(findBrokenDocLinks("src/x.md", source, root)).toEqual([]);
  });

  it("パスを持たないアンカーは、自分自身の見出しを見る", () => {
    place("docs/self.md", "# 表題\n\n[表題へ](#表題)\n");
    const source = "# 表題\n\n[表題へ](#表題)\n";

    expect(findBrokenDocLinks("docs/self.md", source, root)).toEqual([]);
  });

  it("ディレクトリと Markdown 以外は、アンカーを見ない", () => {
    const source = "[木](../docs/nested#無い) [図](../docs/logo.svg#無い)";

    expect(findBrokenDocLinks("src/x.md", source, root)).toEqual([]);
  });

  it("Markdown のコードフェンスとコードスパンは見ない", () => {
    const href = `..${"/docs/nope.md"}`;
    const source = ["```md", `[a](${href})`, "```", `\`[b](${href})\``].join("\n");

    expect(findBrokenDocLinks("src/x.md", source, root)).toEqual([]);
  });

  it("ソースは文字列リテラルを見ない", () => {
    const href = `..${"/docs/nope.md"}`;
    const source = `const template = "[a](${href})";`;

    expect(findBrokenDocLinks("src/x.ts", source, root)).toEqual([]);
  });

  it("参照形式リンクの定義も解決する", () => {
    const source = "[手引き]: ../docs/guide.md\n";

    expect(findBrokenDocLinks("src/x.md", source, root)).toEqual([]);
  });

  // ----- 異常系 -----
  it("段数が足りない相対パスを、行番号とともに返す", () => {
    // リンクは組み立てて置く。書き下すと、このゲート自身がテスト用の壊れたリンクを拾う。
    const href = `..${"/docs/nope.md"}`;
    const source = `\n/** ([手引き](${href})) */`;

    expect(findBrokenDocLinks("src/x.ts", source, root)).toEqual([
      { file: "src/x.ts", href, line: 2, reason: "path" },
    ]);
  });

  it("行の途中から始まる行コメントも見る", () => {
    const href = `..${"/docs/nope.md"}`;
    // 行コメントの印も組み立てて置く。書き下すと、このゲート自身がこの行を拾う。
    const source = `const x = 1; ${"/"}${"/"} [a](${href})`;

    expect(findBrokenDocLinks("src/x.ts", source, root)).toEqual([
      { file: "src/x.ts", href, line: 1, reason: "path" },
    ]);
  });

  it("参照形式リンクの定義が指し先を持たなければ返す", () => {
    const href = `..${"/docs/nope.md"}`;
    const source = `[手引き]: ${href}`;

    expect(findBrokenDocLinks("src/x.md", source, root)).toEqual([
      { file: "src/x.md", href, line: 1, reason: "path" },
    ]);
  });

  it("リポジトリの外を指すリンクは、実在しても解決しないものとして返す", () => {
    const href = `${"../".repeat(8)}etc/hostname`;

    expect(findBrokenDocLinks("src/x.md", `[外](${href})`, root)).toEqual([
      { file: "src/x.md", href, line: 1, reason: "path" },
    ]);
  });

  it("同じ行に複数あればすべて返す", () => {
    const source = `/** [a](..${"/nope-a.md"}) [b](..${"/nope-b.md"}) */`;

    expect(findBrokenDocLinks("src/x.ts", source, root)).toHaveLength(2);
  });

  it("指し先に無い見出しを、アンカー切れとして返す", () => {
    const href = `../docs/guide.md#${"無い節"}`;
    const source = `[無い節](${href})`;

    expect(findBrokenDocLinks("src/x.md", source, root)).toEqual([
      { file: "src/x.md", href, line: 1, reason: "anchor" },
    ]);
  });
});

describe("formatBrokenDocLinks", () => {
  // ----- 正常系 -----
  it("そのまま直せるよう、場所と書かれていたパスと理由を並べる", () => {
    const broken = [
      { file: "src/a.ts", href: "../docs/x.md", line: 3, reason: "path" },
      { file: "src/b.md", href: "../docs/x.md#無い", line: 4, reason: "anchor" },
    ] as const;

    expect(formatBrokenDocLinks(broken, root)).toBe(
      [
        "src/a.ts:3: ../docs/x.md（ファイルが無い）",
        "src/b.md:4: ../docs/x.md#無い（見出しが無い）",
      ].join("\n"),
    );
  });

  it("何も無ければ空文字を返す", () => {
    expect(formatBrokenDocLinks([], root)).toBe("");
  });
});
