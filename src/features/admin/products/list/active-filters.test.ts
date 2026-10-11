import { describe, expect, it } from "vitest";

import { toAdminActiveFilters } from "./active-filters";
import type { AdminProductFilterOption } from "./filter-option";
import { type AdminProductListConditions, DISCONTINUED_FILTER } from "./query";

const NO_CONDITIONS: AdminProductListConditions = {
  keyword: "",
  categoryCodes: [],
  statusCodes: [],
  discontinued: null,
};

const CATEGORIES: readonly AdminProductFilterOption[] = [
  { value: "", label: "すべての分類" },
  { value: "1", label: "電子機器" },
];

const STATUSES: readonly AdminProductFilterOption[] = [
  { value: "", label: "すべての状態" },
  { value: "2", label: "在庫切れ" },
];

function filters(conditions: Partial<AdminProductListConditions>) {
  return toAdminActiveFilters({ ...NO_CONDITIONS, ...conditions }, CATEGORIES, STATUSES);
}

describe("toAdminActiveFilters", () => {
  // ----- 正常系 -----
  it("何も効いていなければ空を返す", () => {
    expect(filters({})).toEqual([]);
  });

  it("検索語をそのまま値に出す", () => {
    expect(filters({ keyword: "鞄" })).toEqual([
      { key: "keyword", label: "キーワード", value: "鞄", removeHref: "/admin/products" },
    ]);
  });

  it("コードではなく選択肢の表示名を値に出す", () => {
    expect(filters({ categoryCodes: ["1"] })[0]?.value).toBe("電子機器");
  });

  it("検索語・分類・状態・廃番の順に並べる", () => {
    expect(
      filters({
        keyword: "鞄",
        categoryCodes: ["1"],
        statusCodes: ["2"],
        discontinued: DISCONTINUED_FILTER.ONLY,
      }).map((f) => f.label),
    ).toEqual(["キーワード", "分類", "状態", "廃番"]);
  });

  it("廃番のみの条件を、綴りではなく呼び名で出す", () => {
    expect(filters({ discontinued: DISCONTINUED_FILTER.ONLY })).toEqual([
      {
        key: "discontinued",
        label: "廃番",
        value: "廃番のみ",
        removeHref: "/admin/products",
      },
    ]);
  });

  it("廃番を除く条件を、その呼び名で出す", () => {
    expect(filters({ discontinued: DISCONTINUED_FILTER.EXCLUDED })[0]?.value).toBe("廃番を除く");
  });

  it("廃番の条件の解除先は、廃番だけを外して他の条件を残す", () => {
    expect(
      filters({ categoryCodes: ["1"], discontinued: DISCONTINUED_FILTER.ONLY }).find(
        (f) => f.key === "discontinued",
      )?.removeHref,
    ).toBe("/admin/products?categoryCodes=1");
  });

  it("他の条件の解除先は、廃番の条件を残す", () => {
    expect(
      filters({ categoryCodes: ["1"], discontinued: DISCONTINUED_FILTER.EXCLUDED })[0]?.removeHref,
    ).toBe("/admin/products?discontinued=false");
  });

  it("解除先はその条件だけを外した URL になる", () => {
    expect(filters({ keyword: "鞄", categoryCodes: ["1"] })[0]?.removeHref).toBe(
      "/admin/products?categoryCodes=1",
    );
  });

  it("解除先は読み進めた位置を持たない", () => {
    expect(filters({ statusCodes: ["2"] })[0]?.removeHref).not.toContain("after=");
  });

  // ----- 異常系 -----
  it("選択肢に無い分類のコードは条件として出さない", () => {
    expect(filters({ categoryCodes: ["999"] })).toEqual([]);
  });

  it("選択肢に無い状態のコードは条件として出さない", () => {
    expect(filters({ statusCodes: ["999"] })).toEqual([]);
  });
});
