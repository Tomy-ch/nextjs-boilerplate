import { describe, expect, it } from "vitest";

import { COUNT_KEY, CURSOR_KEY, FILTER_KEY, toConditions, toProductListHref } from "./list-url";

describe("toConditions", () => {
  // ----- 正常系 -----
  it("絞り込みと並び替えをそのまま残す", () => {
    expect(
      toConditions({
        [FILTER_KEY.CATEGORY]: "c1",
        [FILTER_KEY.KEYWORD]: "鞄",
        [FILTER_KEY.SORT]: "publishedAt",
      }),
    ).toEqual({
      [FILTER_KEY.CATEGORY]: "c1",
      [FILTER_KEY.KEYWORD]: "鞄",
      [FILTER_KEY.SORT]: "publishedAt",
    });
  });

  it("読み進めた位置を落とす", () => {
    expect(
      toConditions({ [CURSOR_KEY]: "cursor-1", [COUNT_KEY]: "48", [FILTER_KEY.CATEGORY]: "c1" }),
    ).toEqual({ [FILTER_KEY.CATEGORY]: "c1" });
  });

  it("条件が無ければ空のまま返す", () => {
    expect(toConditions({})).toEqual({});
  });
});

describe("toProductListHref", () => {
  // ----- 正常系 -----
  it("条件をクエリへ載せる", () => {
    expect(toProductListHref({ [FILTER_KEY.CATEGORY]: "c1" })).toBe("/products?categoryId=c1");
  });

  it("キーを並べ替えて、選んだ順序によらず同じ URL にする", () => {
    const sortedFirst = toProductListHref({
      [FILTER_KEY.CATEGORY]: "c1",
      [FILTER_KEY.SORT]: "publishedAt",
    });
    const sortedLast = toProductListHref({
      [FILTER_KEY.SORT]: "publishedAt",
      [FILTER_KEY.CATEGORY]: "c1",
    });

    expect(sortedFirst).toBe("/products?categoryId=c1&sort=publishedAt");
    expect(sortedLast).toBe(sortedFirst);
  });

  it("読み進めた位置を載せない", () => {
    expect(
      toProductListHref({
        [CURSOR_KEY]: "cursor-1",
        [COUNT_KEY]: "48",
        [FILTER_KEY.CATEGORY]: "c1",
      }),
    ).toBe("/products?categoryId=c1");
  });

  it("値を URL 用に符号化する", () => {
    expect(toProductListHref({ [FILTER_KEY.KEYWORD]: "鞄" })).toBe("/products?keyword=%E9%9E%84");
  });

  // ----- 異常系 -----
  it("指定なしの条件を載せない", () => {
    expect(toProductListHref({ [FILTER_KEY.CATEGORY]: "", [FILTER_KEY.STATUS]: "s1" })).toBe(
      "/products?statusId=s1",
    );
  });

  it("条件がすべて指定なしなら、クエリを付けない", () => {
    expect(toProductListHref({ [FILTER_KEY.CATEGORY]: "", [FILTER_KEY.KEYWORD]: "" })).toBe(
      "/products",
    );
  });
});
