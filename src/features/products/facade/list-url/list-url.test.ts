import { describe, expect, it } from "vitest";

import {
  COUNT_KEY,
  CURSOR_KEY,
  FILTER_KEY,
  toConditions,
  toProductListHref,
  toProductListSearchParams,
  toSelectedValue,
  toSelectedValues,
} from "./list-url";

describe("toSelectedValue", () => {
  // ----- 正常系 -----
  it("1 つだけの値をそのまま返す", () => {
    expect(toSelectedValue({ [FILTER_KEY.KEYWORD]: "鞄" }, FILTER_KEY.KEYWORD)).toBe("鞄");
  });

  it("条件が無ければ空文字を返す", () => {
    expect(toSelectedValue({}, FILTER_KEY.KEYWORD)).toBe("");
  });

  // ----- 異常系 -----
  it("複数の値が届いた条件は単一として読めないため空文字を返す", () => {
    expect(toSelectedValue({ [FILTER_KEY.KEYWORD]: ["鞄", "靴"] }, FILTER_KEY.KEYWORD)).toBe("");
  });
});

describe("toSelectedValues", () => {
  // ----- 正常系 -----
  it("並びをそのまま返す", () => {
    expect(toSelectedValues({ [FILTER_KEY.CATEGORY]: ["a", "b"] }, FILTER_KEY.CATEGORY)).toEqual([
      "a",
      "b",
    ]);
  });

  it("1 つだけの値も並びへ揃える", () => {
    expect(toSelectedValues({ [FILTER_KEY.CATEGORY]: "a" }, FILTER_KEY.CATEGORY)).toEqual(["a"]);
  });

  it("条件が無ければ空の並びを返す", () => {
    expect(toSelectedValues({}, FILTER_KEY.CATEGORY)).toEqual([]);
  });

  it("空文字は指定なしとして空の並びを返す", () => {
    expect(toSelectedValues({ [FILTER_KEY.CATEGORY]: "" }, FILTER_KEY.CATEGORY)).toEqual([]);
  });
});

describe("toProductListSearchParams", () => {
  // ----- 正常系 -----
  it("条件をクエリ文字列へ組む", () => {
    expect(toProductListSearchParams({ [FILTER_KEY.CATEGORY]: "10" }).toString()).toBe(
      "categoryCodes=10",
    );
  });

  it("複数選べる条件を同じキーの繰り返しにする", () => {
    expect(toProductListSearchParams({ [FILTER_KEY.CATEGORY]: ["20", "10"] }).toString()).toBe(
      "categoryCodes=10&categoryCodes=20",
    );
  });

  it("読み進めた位置を載せない", () => {
    expect(
      toProductListSearchParams({ [CURSOR_KEY]: "cursor-1", [COUNT_KEY]: "48" }).toString(),
    ).toBe("");
  });

  it("条件が無ければ空で返す", () => {
    expect(toProductListSearchParams({}).size).toBe(0);
  });
});

describe("toConditions", () => {
  // ----- 正常系 -----
  it("絞り込みと並び替えをそのまま残す", () => {
    expect(
      toConditions({
        [FILTER_KEY.CATEGORY]: "10",
        [FILTER_KEY.KEYWORD]: "鞄",
        [FILTER_KEY.SORT]: "publishedAt",
      }),
    ).toEqual({
      [FILTER_KEY.CATEGORY]: "10",
      [FILTER_KEY.KEYWORD]: "鞄",
      [FILTER_KEY.SORT]: "publishedAt",
    });
  });

  it("読み進めた位置を落とす", () => {
    expect(
      toConditions({ [CURSOR_KEY]: "cursor-1", [COUNT_KEY]: "48", [FILTER_KEY.CATEGORY]: "10" }),
    ).toEqual({ [FILTER_KEY.CATEGORY]: "10" });
  });

  it("条件が無ければ空のまま返す", () => {
    expect(toConditions({})).toEqual({});
  });
});

describe("toProductListHref", () => {
  // ----- 正常系 -----
  it("条件をクエリへ載せる", () => {
    expect(toProductListHref({ [FILTER_KEY.CATEGORY]: "10" })).toBe("/products?categoryCodes=10");
  });

  it("キーを並べ替えて、選んだ順序によらず同じ URL にする", () => {
    const sortedFirst = toProductListHref({
      [FILTER_KEY.CATEGORY]: "10",
      [FILTER_KEY.SORT]: "publishedAt",
    });
    const sortedLast = toProductListHref({
      [FILTER_KEY.SORT]: "publishedAt",
      [FILTER_KEY.CATEGORY]: "10",
    });

    expect(sortedFirst).toBe("/products?categoryCodes=10&sort=publishedAt");
    expect(sortedLast).toBe(sortedFirst);
  });

  it("読み進めた位置を載せない", () => {
    expect(
      toProductListHref({
        [CURSOR_KEY]: "cursor-1",
        [COUNT_KEY]: "48",
        [FILTER_KEY.CATEGORY]: "10",
      }),
    ).toBe("/products?categoryCodes=10");
  });

  it("値を URL 用に符号化する", () => {
    expect(toProductListHref({ [FILTER_KEY.KEYWORD]: "鞄" })).toBe("/products?keyword=%E9%9E%84");
  });

  // ----- 異常系 -----
  it("指定なしの条件を載せない", () => {
    expect(toProductListHref({ [FILTER_KEY.CATEGORY]: "", [FILTER_KEY.STATUS]: "5" })).toBe(
      "/products?statusCodes=5",
    );
  });

  it("条件がすべて指定なしなら、クエリを付けない", () => {
    expect(toProductListHref({ [FILTER_KEY.CATEGORY]: "", [FILTER_KEY.KEYWORD]: "" })).toBe(
      "/products",
    );
  });
});
