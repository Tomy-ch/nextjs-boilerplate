// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import type { AppliedCoupon } from "@/model/coupon/coupon";

import { PurchaseAppliedCoupon } from "./applied-coupon";

const CAPPED_RATE: AppliedCoupon = {
  discount: { kind: "rate", value: "0.10", maxAmount: 1_000 },
  scopeKind: "all",
};

describe("PurchaseAppliedCoupon", () => {
  // ----- 上限付きの定率のとき -----

  it("額面・上限・範囲を 1 行で出す", () => {
    render(<PurchaseAppliedCoupon coupon={CAPPED_RATE} />);

    expect(screen.getByText("10% 引き（上限 $10.00）・全商品が対象")).toBeVisible();
  });

  // ----- 上限の無いとき -----

  it("定額なら上限の括弧を出さない", () => {
    render(
      <PurchaseAppliedCoupon
        coupon={{ discount: { kind: "flat", value: "5.00" }, scopeKind: "product" }}
      />,
    );

    expect(screen.getByText("$5.00 引き・特定の商品が対象")).toBeVisible();
  });

  it("上限なしの定率なら上限の括弧を出さない", () => {
    render(
      <PurchaseAppliedCoupon
        coupon={{
          discount: { kind: "rate", value: "0.15", maxAmount: null },
          scopeKind: "category",
        }}
      />,
    );

    expect(screen.getByText("15% 引き・特定のカテゴリが対象")).toBeVisible();
  });

  // ----- 共通 -----

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<PurchaseAppliedCoupon coupon={CAPPED_RATE} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
