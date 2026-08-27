import { describe, expect, it } from "vitest";

import type { DashboardSummary } from "@/model/dashboard/dashboard";

import { toSummaryCards } from "./summary-cards";

const SUMMARY: DashboardSummary = {
  salesAmount: 123_456,
  salesCount: 1234,
  purchaseStatusCounts: [{ statusId: "1", statusName: "検討中", count: 5 }],
  totalProductCount: 476,
  publishedProductCount: 454,
};

describe("toSummaryCards", () => {
  // ----- 正常系 -----
  it("期間で動く 2 枚 → 動かない 2 枚の順に並べる", () => {
    expect(toSummaryCards(SUMMARY).map((card) => card.id)).toEqual([
      "sales-amount",
      "sales-count",
      "published-product-count",
      "total-product-count",
    ]);
  });

  it("売上は通貨表記、件数は桁区切りで整形する", () => {
    const values = new Map(toSummaryCards(SUMMARY).map((card) => [card.id, card.value]));

    expect(values.get("sales-amount")).toBe("$1,234.56");
    expect(values.get("sales-count")).toBe("1,234");
    expect(values.get("total-product-count")).toBe("476");
  });

  it("どのカードにも母集団の注記が付く", () => {
    expect(toSummaryCards(SUMMARY).every((card) => card.note.length > 0)).toBe(true);
  });

  it("母集団の一致する公開中の商品だけが行き先を持つ", () => {
    const published = toSummaryCards(SUMMARY).find((card) => card.id === "published-product-count");

    expect(published?.href).toBe("/admin/products");
    expect(published?.linkLabel).toBe("公開中の商品を一覧で見る");
  });

  it("登録済みの商品は行き先を持たない", () => {
    const total = toSummaryCards(SUMMARY).find((card) => card.id === "total-product-count");

    expect(total?.href).toBeUndefined();
    expect(total?.linkLabel).toBeUndefined();
  });
});
