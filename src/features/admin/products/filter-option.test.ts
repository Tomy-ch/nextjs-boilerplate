import { describe, expect, it } from "vitest";

import { toFilterOptions } from "./filter-option";

describe("toFilterOptions", () => {
  // ----- 正常系 -----
  it("マスタの並び順をそのまま保つ", () => {
    const options = toFilterOptions([
      { code: 2, name: "書籍" },
      { code: 1, name: "電子機器" },
    ]);

    expect(options.map((option) => option.label)).toEqual(["書籍", "電子機器"]);
  });

  it("値にはコードを使い、UUID を持ち出さない", () => {
    expect(toFilterOptions([{ code: 6, name: "入荷待ち" }])[0]).toEqual({
      value: "6",
      label: "入荷待ち",
    });
  });

  it("指定なしを候補として持たない", () => {
    const options = toFilterOptions([{ code: 1, name: "電子機器" }]);

    expect(options.some((option) => option.value === "")).toBe(false);
  });

  // ----- 異常系 -----
  it("マスタが空なら候補も空になる", () => {
    expect(toFilterOptions([])).toEqual([]);
  });
});
