import { describe, expect, it } from "vitest";
import { normalizeSearchParams } from "./query";

describe("normalizeSearchParams", () => {
  // ----- 正常系 -----
  it("1 つのキーに 1 つの文字列を残す", () => {
    expect(normalizeSearchParams({ keyword: "イヤホン", categoryCodes: "10" })).toEqual({
      keyword: "イヤホン",
      categoryCodes: "10",
    });
  });

  it("同じキーが複数あれば並びのまま残す", () => {
    expect(normalizeSearchParams({ categoryCodes: ["10", "20"] })).toEqual({
      categoryCodes: ["10", "20"],
    });
  });

  it("同じキーが 1 つだけなら文字列のまま残す", () => {
    expect(normalizeSearchParams({ categoryCodes: ["10"] })).toEqual({ categoryCodes: "10" });
  });

  it("複数の値を受け取れない条件が重複したら、指定なしとして落とす", () => {
    expect(normalizeSearchParams({ keyword: ["本", "雑誌"] })).toEqual({});
  });

  it("並びの中の空白だけの値を落とす", () => {
    expect(normalizeSearchParams({ categoryCodes: ["10", "  "] })).toEqual({ categoryCodes: "10" });
  });

  it("前後の空白を落とす", () => {
    expect(normalizeSearchParams({ keyword: "  イヤホン  " })).toEqual({ keyword: "イヤホン" });
  });

  // ----- 異常系 -----
  it("空文字のキーを未指定として落とす", () => {
    expect(normalizeSearchParams({ keyword: "", categoryCodes: "10" })).toEqual({
      categoryCodes: "10",
    });
  });

  it("空白だけのキーを未指定として落とす", () => {
    expect(normalizeSearchParams({ keyword: "   ", categoryCodes: "10" })).toEqual({
      categoryCodes: "10",
    });
  });

  it("値の無いキーを未指定として落とす", () => {
    expect(normalizeSearchParams({ keyword: undefined, categoryCodes: "10" })).toEqual({
      categoryCodes: "10",
    });
  });

  it("空の配列を未指定として落とす", () => {
    expect(normalizeSearchParams({ keyword: [], categoryCodes: "10" })).toEqual({
      categoryCodes: "10",
    });
  });

  it("キーが 1 つも無ければ空にする", () => {
    expect(normalizeSearchParams({})).toEqual({});
  });
});
