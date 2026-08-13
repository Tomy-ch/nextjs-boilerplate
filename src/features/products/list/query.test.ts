import { describe, expect, it } from "vitest";
import { normalizeSearchParams } from "./query";

describe("normalizeSearchParams", () => {
  // ----- 正常系 -----
  it("1 つのキーに 1 つの文字列を残す", () => {
    expect(normalizeSearchParams({ keyword: "イヤホン", categoryId: "c1" })).toEqual({
      keyword: "イヤホン",
      categoryId: "c1",
    });
  });

  it("同じキーが複数あれば先頭を採る", () => {
    expect(normalizeSearchParams({ keyword: ["靴", "鞄"] })).toEqual({ keyword: "靴" });
  });

  it("前後の空白を落とす", () => {
    expect(normalizeSearchParams({ keyword: "  イヤホン  " })).toEqual({ keyword: "イヤホン" });
  });

  // ----- 異常系 -----
  it("空文字のキーを未指定として落とす", () => {
    expect(normalizeSearchParams({ keyword: "", categoryId: "c1" })).toEqual({ categoryId: "c1" });
  });

  it("空白だけのキーを未指定として落とす", () => {
    expect(normalizeSearchParams({ keyword: "   ", categoryId: "c1" })).toEqual({
      categoryId: "c1",
    });
  });

  it("値の無いキーを未指定として落とす", () => {
    expect(normalizeSearchParams({ keyword: undefined, categoryId: "c1" })).toEqual({
      categoryId: "c1",
    });
  });

  it("空の配列を未指定として落とす", () => {
    expect(normalizeSearchParams({ keyword: [], categoryId: "c1" })).toEqual({ categoryId: "c1" });
  });

  it("キーが 1 つも無ければ空にする", () => {
    expect(normalizeSearchParams({})).toEqual({});
  });
});
