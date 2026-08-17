import { describe, expect, it } from "vitest";

import { FILTER_KEY } from "../facade/list-url/list-url";
import { toActiveFilters } from "./active-filters";
import type { FilterOption } from "./query";

const CATEGORIES: readonly FilterOption[] = [
  { value: "c1", label: "オーディオ" },
  { value: "c2", label: "ウェアラブル" },
];

describe("toActiveFilters", () => {
  // ----- 正常系 -----
  it("分類を選んだ表示名で出す", () => {
    expect(toActiveFilters(CATEGORIES, { [FILTER_KEY.CATEGORY]: "c1" })).toEqual([
      { key: "categoryId:c1", label: "カテゴリ", value: "オーディオ", removeHref: "/products" },
    ]);
  });

  it("選んだ分類の数だけ並べ、外す先はその 1 つだけを落とす", () => {
    const filters = toActiveFilters(CATEGORIES, { [FILTER_KEY.CATEGORY]: ["c1", "c2"] });

    expect(filters.map((filter) => filter.value)).toEqual(["オーディオ", "ウェアラブル"]);
    expect(filters[0]?.removeHref).toBe("/products?categoryId=c2");
  });

  it("価格を下限と上限で 1 つにまとめ、外す先は両方を落とす", () => {
    expect(
      toActiveFilters(CATEGORIES, {
        [FILTER_KEY.MIN_PRICE]: "25",
        [FILTER_KEY.MAX_PRICE]: "250",
      }),
    ).toEqual([{ key: "minPrice", label: "価格", value: "$25 〜 $250", removeHref: "/products" }]);
  });

  it("片側だけの価格は、もう片方を指定なしとして出す", () => {
    expect(toActiveFilters(CATEGORIES, { [FILTER_KEY.MIN_PRICE]: "50" })[0]?.value).toBe(
      "$50 〜 上限なし",
    );
  });

  it("在庫状況を選んだ表示名で出す", () => {
    expect(toActiveFilters(CATEGORIES, { [FILTER_KEY.MIN_QUANTITY]: "1" })).toEqual([
      { key: "minQuantity", label: "在庫状況", value: "在庫あり", removeHref: "/products" },
    ]);
  });

  it("キーワードをそのままの値で出す", () => {
    expect(toActiveFilters(CATEGORIES, { [FILTER_KEY.KEYWORD]: "鞄" })).toEqual([
      { key: "keyword", label: "キーワード", value: "鞄", removeHref: "/products" },
    ]);
  });

  it("効いている条件が無ければ空で返す", () => {
    expect(toActiveFilters(CATEGORIES, {})).toEqual([]);
  });

  it("並び替えを条件として並べない", () => {
    expect(toActiveFilters(CATEGORIES, { [FILTER_KEY.SORT]: "publishedAt" })).toEqual([]);
  });

  it("外す先に、他の条件は残す", () => {
    expect(
      toActiveFilters(CATEGORIES, {
        [FILTER_KEY.CATEGORY]: "c1",
        [FILTER_KEY.KEYWORD]: "鞄",
      })[0]?.removeHref,
    ).toBe("/products?keyword=%E9%9E%84");
  });

  // ----- 異常系 -----
  it("選択肢に無い分類を飛ばす", () => {
    expect(toActiveFilters(CATEGORIES, { [FILTER_KEY.CATEGORY]: "unknown" })).toEqual([]);
  });

  it("目盛りに無い価格は条件として並べない", () => {
    expect(toActiveFilters(CATEGORIES, { [FILTER_KEY.MIN_PRICE]: "37" })).toEqual([]);
  });

  it("3 つの選択肢のどれにも当たらない在庫数の範囲を並べない", () => {
    expect(
      toActiveFilters(CATEGORIES, {
        [FILTER_KEY.MIN_QUANTITY]: "5",
        [FILTER_KEY.MAX_QUANTITY]: "10",
      }),
    ).toEqual([]);
  });

  it("複数回現れたキーワードは単一として読めないため並べない", () => {
    expect(toActiveFilters(CATEGORIES, { [FILTER_KEY.KEYWORD]: ["鞄", "靴"] })).toEqual([]);
  });
});
