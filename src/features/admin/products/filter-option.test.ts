import { describe, expect, it } from "vitest";

import { toFilterOptions } from "./filter-option";

describe("toFilterOptions", () => {
  // ----- 正常系 -----
  it("先頭に指定なしを置く", () => {
    expect(toFilterOptions([], "すべての分類")[0]).toEqual({ value: "", label: "すべての分類" });
  });

  it("マスタの並び順をそのまま保つ", () => {
    const options = toFilterOptions(
      [
        { code: 2, name: "書籍" },
        { code: 1, name: "電子機器" },
      ],
      "すべての分類",
    );

    expect(options.map((option) => option.label)).toEqual(["すべての分類", "書籍", "電子機器"]);
  });

  it("値にはコードを使い、UUID を持ち出さない", () => {
    expect(toFilterOptions([{ code: 6, name: "入荷待ち" }], "すべての状態")[1]).toEqual({
      value: "6",
      label: "入荷待ち",
    });
  });

  it("マスタが空でも指定なしだけを返す", () => {
    expect(toFilterOptions([], "すべての状態")).toHaveLength(1);
  });
});
