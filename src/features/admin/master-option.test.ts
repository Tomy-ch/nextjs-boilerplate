import { describe, expect, it } from "vitest";

import { toMasterOptions } from "./master-option";

describe("toMasterOptions", () => {
  // ----- 正常系 -----
  it("識別子を値、表示名を文言として写す", () => {
    expect(toMasterOptions([{ id: "abc", name: "電子機器" }])).toEqual([
      { value: "abc", label: "電子機器" },
    ]);
  });

  it("指定なしの候補を足さない", () => {
    expect(toMasterOptions([{ id: "abc", name: "電子機器" }])).toHaveLength(1);
  });

  it("受け取った順序を保つ", () => {
    const options = toMasterOptions([
      { id: "1", name: "電子機器" },
      { id: "2", name: "書籍" },
    ]);

    expect(options.map((option) => option.label)).toEqual(["電子機器", "書籍"]);
  });

  it("マスタが空なら候補も空になる", () => {
    expect(toMasterOptions([])).toEqual([]);
  });
});
