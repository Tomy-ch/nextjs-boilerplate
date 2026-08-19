import { describe, expect, it } from "vitest";

import { BADGE_VARIANT } from "@/components/design-system/display/badge/badge.definition";
import type { Product, ProductStatus } from "@/model/product/product";
import { toProductId } from "@/model/product/product";

import { toAdminProductRows } from "./row";

const STATUS_ID = "6b0f2f3e-0000-4000-8000-000000000001";

const STATUSES: readonly ProductStatus[] = [
  { id: STATUS_ID, name: "在庫切れ", code: 2 },
  { id: "6b0f2f3e-0000-4000-8000-000000000002", name: "在庫あり", code: 1 },
];

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: toProductId("0195f0c2-0000-7000-8000-000000000001"),
    name: "ワイヤレスイヤホン",
    description: null,
    price: "19.99",
    quantity: 12,
    stockWarningThreshold: null,
    status: { id: STATUS_ID, name: "在庫切れ" },
    category: { id: "c1", name: "電子機器" },
    publishedAt: null,
    imagePaths: [],
    ...overrides,
  };
}

describe("toAdminProductRows", () => {
  // ----- 正常系 -----
  it("表に出す項目だけを写す", () => {
    expect(toAdminProductRows([product()], STATUSES)[0]).toEqual({
      id: product().id,
      name: "ワイヤレスイヤホン",
      price: "19.99",
      quantity: 12,
      categoryName: "電子機器",
      statusName: "在庫切れ",
      statusTone: BADGE_VARIANT.DESTRUCTIVE,
    });
  });

  it("状態の指し先からコードを引いて見た目を決める", () => {
    const rows = toAdminProductRows(
      [product({ status: { id: STATUSES[1].id, name: "在庫あり" } })],
      STATUSES,
    );

    expect(rows[0]?.statusTone).toBe(BADGE_VARIANT.SECONDARY);
  });

  it("受け取った順序を保つ", () => {
    const rows = toAdminProductRows([product({ name: "A" }), product({ name: "B" })], STATUSES);

    expect(rows.map((row) => row.name)).toEqual(["A", "B"]);
  });

  it("商品が無ければ空を返す", () => {
    expect(toAdminProductRows([], STATUSES)).toEqual([]);
  });

  // ----- 異常系 -----
  it("マスタに無い状態は既定の見た目へ倒す", () => {
    const rows = toAdminProductRows([product()], []);

    expect(rows[0]?.statusTone).toBe(BADGE_VARIANT.OUTLINE);
  });

  it("マスタに無い状態でも表示名はそのまま出す", () => {
    expect(toAdminProductRows([product()], [])[0]?.statusName).toBe("在庫切れ");
  });
});
