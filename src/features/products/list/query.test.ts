import { describe, expect, it } from "vitest";

import { normalizeSearchParams, toConditions, toProductListHref } from "./query";

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

describe("toConditions", () => {
  // ----- 正常系 -----
  it("絞り込みと並び替えを残す", () => {
    expect(toConditions({ keyword: "イヤホン", categoryId: "c1", sort: "publishedAt" })).toEqual({
      keyword: "イヤホン",
      categoryId: "c1",
      sort: "publishedAt",
    });
  });

  it("読み進めたカーソルを落とす", () => {
    expect(toConditions({ keyword: "靴", after: "cursor-1" })).toEqual({ keyword: "靴" });
  });

  it("読み進めた件数を落とす", () => {
    expect(toConditions({ keyword: "靴", first: "48" })).toEqual({ keyword: "靴" });
  });

  // ----- 異常系 -----
  it("条件が位置だけなら空にする", () => {
    expect(toConditions({ after: "cursor-1", first: "48" })).toEqual({});
  });
});

describe("toProductListHref", () => {
  // ----- 正常系 -----
  it("条件を query に載せた URL を組む", () => {
    expect(toProductListHref({ categoryId: "c1" })).toBe("/products?categoryId=c1");
  });

  it("キーを名前順に並べる", () => {
    expect(toProductListHref({ sort: "publishedAt", statusId: "s1", categoryId: "c1" })).toBe(
      "/products?categoryId=c1&sort=publishedAt&statusId=s1",
    );
  });

  it("URL に使えない文字を符号化する", () => {
    expect(toProductListHref({ keyword: "イヤホン" })).toBe(
      `/products?keyword=${encodeURIComponent("イヤホン")}`,
    );
  });

  // ----- 異常系 -----
  it("条件が無ければパスだけを返す", () => {
    expect(toProductListHref({})).toBe("/products");
  });

  it("「指定なし」の空文字を載せない", () => {
    expect(toProductListHref({ categoryId: "", statusId: "s1" })).toBe("/products?statusId=s1");
  });

  it("すべての条件が「指定なし」ならパスだけを返す", () => {
    expect(toProductListHref({ categoryId: "", statusId: "" })).toBe("/products");
  });

  it("読み進めた位置を引き継がない", () => {
    expect(toProductListHref({ keyword: "kutsu", after: "cursor-1", first: "48" })).toBe(
      "/products?keyword=kutsu",
    );
  });
});
