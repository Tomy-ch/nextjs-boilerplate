import { describe, expect, it } from "vitest";
import { toActiveFilters } from "./active-filters";
import { FILTER_KEY } from "./query";
import type { FilterGroup } from "./ui/filter-fields/filter-fields";

const CATEGORY_GROUP: FilterGroup = {
  key: FILTER_KEY.CATEGORY,
  legend: "カテゴリ",
  options: [
    { value: "", label: "すべて" },
    { value: "c1", label: "オーディオ" },
    { value: "c2", label: "ウェアラブル" },
  ],
};

describe("toActiveFilters", () => {
  // ----- 正常系 -----
  it("選ばれた値を、群の名前と選択肢の表示名で返す", () => {
    expect(toActiveFilters([CATEGORY_GROUP], { [FILTER_KEY.CATEGORY]: "c1" })).toEqual([
      {
        key: FILTER_KEY.CATEGORY,
        label: "カテゴリ",
        value: "オーディオ",
        removeHref: "/products",
      },
    ]);
  });

  it("解除先から、その条件だけを外す", () => {
    const [filter] = toActiveFilters([CATEGORY_GROUP], {
      [FILTER_KEY.CATEGORY]: "c2",
      [FILTER_KEY.KEYWORD]: "鞄",
    });

    expect(filter?.removeHref).toBe("/products?keyword=%E9%9E%84");
  });

  it("キーワードを、選択肢を持たない条件として並べる", () => {
    expect(toActiveFilters([], { [FILTER_KEY.KEYWORD]: "イヤホン" })).toEqual([
      {
        key: FILTER_KEY.KEYWORD,
        label: "キーワード",
        value: "イヤホン",
        removeHref: "/products",
      },
    ]);
  });

  it("群を宣言の順に並べ、キーワードを最後に置く", () => {
    const filters = toActiveFilters([CATEGORY_GROUP], {
      [FILTER_KEY.KEYWORD]: "鞄",
      [FILTER_KEY.CATEGORY]: "c1",
    });

    expect(filters.map((filter) => filter.key)).toEqual([FILTER_KEY.CATEGORY, FILTER_KEY.KEYWORD]);
  });

  // ----- 異常系 -----
  it("指定なしの群を並べない", () => {
    expect(toActiveFilters([CATEGORY_GROUP], { [FILTER_KEY.CATEGORY]: "" })).toEqual([]);
  });

  it("選択肢に無い値を並べない", () => {
    expect(toActiveFilters([CATEGORY_GROUP], { [FILTER_KEY.CATEGORY]: "消えた分類" })).toEqual([]);
  });

  it("並び替えを条件として並べない", () => {
    expect(toActiveFilters([CATEGORY_GROUP], { [FILTER_KEY.SORT]: "publishedAt" })).toEqual([]);
  });

  it("空のキーワードを並べない", () => {
    expect(toActiveFilters([], { [FILTER_KEY.KEYWORD]: "" })).toEqual([]);
  });
});
