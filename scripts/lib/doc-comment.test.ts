import { describe, expect, it } from "vitest";

import { findDocBlocks, findDocTags } from "./doc-comment";

describe("findDocBlocks", () => {
  // ----- 正常系 -----
  it("複数行の doc comment を、始まりと終わりの行つきで取り出す", () => {
    const source = ["const a = 1;", "/**", " * 説明。", " */", "export const b = 2;"].join("\n");

    expect(findDocBlocks(source)).toEqual([
      { startLine: 2, endLine: 4, lines: ["/**", " * 説明。", " */"] },
    ]);
  });

  it("1 行で閉じる doc comment も取り出す", () => {
    expect(findDocBlocks("/** 説明。 */\nexport const a = 1;")).toEqual([
      { startLine: 1, endLine: 1, lines: ["/** 説明。 */"] },
    ]);
  });

  it("同じファイルの複数のブロックをすべて取り出す", () => {
    const source = ["/** 1 つめ。 */", "const a = 1;", "/**", " * 2 つめ。", " */"].join("\n");

    expect(findDocBlocks(source).map(({ startLine }) => startLine)).toEqual([1, 3]);
  });

  // ----- 異常系 -----
  it("doc comment でないブロックコメントを取り出さない", () => {
    expect(findDocBlocks("/*\n * ただのコメント。\n */\nconst a = 1;")).toEqual([]);
  });

  it("閉じていないブロックを取り出さない", () => {
    expect(findDocBlocks("/**\n * 閉じていない。\nconst a = 1;")).toEqual([]);
  });

  it("doc comment を持たないソースから何も取り出さない", () => {
    expect(findDocBlocks("export const a = 1;\n// 行コメント\n")).toEqual([]);
  });
});

describe("findDocTags", () => {
  // ----- 正常系 -----
  it("doc comment の中のタグを、行つきで返す", () => {
    const source = [
      "/**",
      " * 説明。",
      " *",
      " * @example",
      " * ```ts",
      " * a();",
      " * ```",
      " */",
    ].join("\n");

    expect(findDocTags(source, "example").map(({ line }) => line)).toEqual([4]);
  });

  it("同じタグが複数のブロックに現れたら、すべて返す", () => {
    const source = ["/**", " * @example", " */", "const a = 1;", "/**", " * @example", " */"].join(
      "\n",
    );

    expect(findDocTags(source, "example").map(({ line }) => line)).toEqual([2, 6]);
  });

  it("タグを含むブロックそのものを併せて返す", () => {
    const source = ["/**", " * @remarks", " */"].join("\n");

    expect(findDocTags(source, "remarks")[0]?.block.startLine).toBe(1);
  });

  // ----- 異常系 -----
  it("コードの中の同じ綴りを拾わない", () => {
    expect(findDocTags('const mail = "user@example.com";', "example")).toEqual([]);
  });

  it("散文の途中に現れた綴りをタグとして扱わない", () => {
    expect(findDocTags("/**\n * 綴りは @example である。\n */", "example")).toEqual([]);
  });

  it("名前が前方一致するだけの別のタグを拾わない", () => {
    expect(findDocTags("/**\n * @examples\n */", "example")).toEqual([]);
  });
});
