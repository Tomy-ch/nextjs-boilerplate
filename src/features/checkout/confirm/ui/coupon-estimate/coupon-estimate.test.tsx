// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback } from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("../../../actions", () => ({ placeOrderAction: vi.fn() }));

import type { CartCoupon, CouponId } from "@/model/coupon/coupon";
import { formatMoney } from "@/model/money";

import { CART_COUPONS } from "../../../checkout.fixture";
import {
  PlaceOrderStateProvider,
  usePlaceOrderState,
} from "../place-order-state/place-order-state";
import { CouponEstimate } from "./coupon-estimate";

const LABEL = "クーポン値引き（見込み）";
const NOTE = "クーポンの値引きは確定時に決まります。";
/** 先頭の候補の額面（10% 引き・上限 $10.00）を、確定できるカートの小計へ当て直した額。 */
const FACE_VALUE_DISCOUNT = 1_000;

/** クーポンを選び直す引き手。選択は送信状態の器が持つ。 */
function SelectCouponButton({ couponId, label }: { couponId: CouponId | null; label: string }) {
  const { selectCoupon } = usePlaceOrderState();
  const select = useCallback(() => selectCoupon(couponId), [selectCoupon, couponId]);

  return (
    <button onClick={select} type="button">
      {label}
    </button>
  );
}

function couponAt(index: number): CartCoupon {
  const coupon = CART_COUPONS[index];

  if (coupon === undefined) throw new Error("クーポンの候補が無い");

  return coupon;
}

function renderEstimate(coupons: readonly CartCoupon[] | null = CART_COUPONS) {
  return render(
    <PlaceOrderStateProvider coupons={coupons}>
      <SelectCouponButton couponId={couponAt(0).id} label="1 枚目を選ぶ" />
      <SelectCouponButton couponId={couponAt(1).id} label="2 枚目を選ぶ" />
      <SelectCouponButton couponId={null} label="使わない" />
      <CouponEstimate />
    </PlaceOrderStateProvider>,
  );
}

describe("CouponEstimate", () => {
  // ----- クーポンを選んでいないとき -----
  it("まだ何も選んでいなければ、見込みの行も添え書きも出さない", () => {
    renderEstimate();

    expect(screen.queryByText(LABEL)).not.toBeInTheDocument();
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });

  // ----- クーポンを選んだとき -----
  it("選んだクーポンの受け取った値引き額を、見込みとして出す", async () => {
    const coupon = couponAt(0);

    renderEstimate();
    await userEvent.click(screen.getByRole("button", { name: "1 枚目を選ぶ" }));

    expect(screen.getByText(LABEL)).toBeVisible();
    expect(screen.getByText(formatMoney(-coupon.discountAmount))).toBeVisible();
    expect(screen.queryByText(formatMoney(-FACE_VALUE_DISCOUNT))).not.toBeInTheDocument();
  });

  it("見込みの行に、値引きが確定時に決まることを添える", async () => {
    renderEstimate();
    await userEvent.click(screen.getByRole("button", { name: "1 枚目を選ぶ" }));

    expect(screen.getByText(LABEL)).toBeVisible();
    expect(screen.getByText(NOTE)).toBeVisible();
  });

  it("選び直すと、見込みを選び直したクーポンの額に替える", async () => {
    renderEstimate();
    await userEvent.click(screen.getByRole("button", { name: "1 枚目を選ぶ" }));
    await userEvent.click(screen.getByRole("button", { name: "2 枚目を選ぶ" }));

    expect(screen.getByText(formatMoney(-couponAt(1).discountAmount))).toBeVisible();
    expect(screen.queryByText(formatMoney(-couponAt(0).discountAmount))).not.toBeInTheDocument();
  });

  it("クーポンを選んだ後に使わないを選ぶと、見込みの行を消す", async () => {
    renderEstimate();
    await userEvent.click(screen.getByRole("button", { name: "1 枚目を選ぶ" }));
    await userEvent.click(screen.getByRole("button", { name: "使わない" }));

    expect(screen.queryByText(LABEL)).not.toBeInTheDocument();
  });

  it("見込みを出していても a11y 自動検査に違反しない", async () => {
    const { container } = renderEstimate();

    await userEvent.click(screen.getByRole("button", { name: "1 枚目を選ぶ" }));

    expect((await axe(container)).violations).toEqual([]);
  });

  // ----- 候補を読めなかったとき -----
  it("候補を読めなければ、見込みの行を出さない", async () => {
    renderEstimate(null);
    await userEvent.click(screen.getByRole("button", { name: "1 枚目を選ぶ" }));

    expect(screen.queryByText(LABEL)).not.toBeInTheDocument();
  });
});
