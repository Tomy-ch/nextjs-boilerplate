import { describe, expect, it } from "vitest";
import { toProductCategoryId, toProductId } from "@/model/product/product";

import { toCouponScopeInput } from "./coupon-scope";

describe("toCouponScopeInput", () => {
  // ----- 正常系 -----
  it("全体は対象を null で写す", () => {
    expect(toCouponScopeInput({ kind: "all" })).toStrictEqual({ kind: "all", targetId: null });
  });

  it.each([
    {
      label: "カテゴリ",
      scope: {
        kind: "category",
        categoryId: toProductCategoryId("5dd52d84-78eb-4a52-ba0b-2e11c95c2af2"),
      },
      wire: { kind: "category", targetId: "5dd52d84-78eb-4a52-ba0b-2e11c95c2af2" },
    },
    {
      label: "商品",
      scope: { kind: "product", productId: toProductId("0f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b11") },
      wire: { kind: "product", targetId: "0f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b11" },
    },
  ] as const)("$label に絞る範囲は、その識別子を対象として写す", ({ scope, wire }) => {
    expect(toCouponScopeInput(scope)).toStrictEqual(wire);
  });
});
