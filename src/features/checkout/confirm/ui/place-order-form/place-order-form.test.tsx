// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback } from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("../../../actions", () => ({ placeOrderAction: vi.fn() }));

import { type CartCoupon, type CouponId, toCouponId } from "@/model/coupon/coupon";
import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";
import { COUPON_ID_FIELD } from "../../../form-fields";
import {
  PlaceOrderStateProvider,
  usePlaceOrderState,
} from "../place-order-state/place-order-state";
import { PlaceOrderForm } from "./place-order-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COUPON: CartCoupon = {
  id: toCouponId("0193a1c0-0001-7000-8000-000000000001"),
  discount: { kind: "flat", value: "5.00" },
  scopeKind: "all",
  discountAmount: 500,
  expiresAt: new Date("2027-06-30T14:59:59Z"),
};

/** 送信の状態は器が持つ。描き直せるよう、器ごと組み立てる。 */
function renderForm(orderable = true) {
  return render(
    <PlaceOrderStateProvider coupons={[]}>
      <PlaceOrderForm orderable={orderable} />
    </PlaceOrderStateProvider>,
  );
}

/** クーポンを選び直す引き手。選択は器が持つため、同じ器の中から選ぶ。 */
function SelectCouponButton({ couponId, label }: { couponId: CouponId | null; label: string }) {
  const { selectCoupon } = usePlaceOrderState();
  const select = useCallback(() => selectCoupon(couponId), [selectCoupon, couponId]);

  return (
    <button type="button" onClick={select}>
      {label}
    </button>
  );
}

function renderWithCoupon() {
  return render(
    <PlaceOrderStateProvider coupons={[COUPON]}>
      <SelectCouponButton couponId={COUPON.id} label="クーポンを選ぶ" />
      <SelectCouponButton couponId={null} label="使わないを選ぶ" />
      <PlaceOrderForm orderable />
    </PlaceOrderStateProvider>,
  );
}

describe("PlaceOrderForm", () => {
  it("確定の操作を出す", () => {
    renderForm();

    expect(screen.getByRole("button", { name: "注文を確定する" })).toBeEnabled();
  });

  it("器が mount のときに作った鍵を送信へ載せる", () => {
    const { container } = renderForm();

    expect(
      container.querySelector(`input[name="${IDEMPOTENCY_KEY_FIELD}"]`)?.getAttribute("value"),
    ).toMatch(UUID);
  });

  it("組み直された画面で描き直しても、送信へ載せる鍵は変えない", () => {
    const { container, rerender } = renderForm();
    const first = container
      .querySelector(`input[name="${IDEMPOTENCY_KEY_FIELD}"]`)
      ?.getAttribute("value");

    rerender(
      <PlaceOrderStateProvider coupons={[]}>
        <PlaceOrderForm orderable />
      </PlaceOrderStateProvider>,
    );

    expect(first).toMatch(UUID);
    expect(container.querySelector(`input[name="${IDEMPOTENCY_KEY_FIELD}"]`)).toHaveValue(first);
  });

  it("クーポンを選んでいなければ、送信へクーポンを載せない", () => {
    const { container } = renderWithCoupon();

    expect(container.querySelector(`input[name="${COUPON_ID_FIELD}"]`)).not.toBeInTheDocument();
  });

  it("選んだクーポンを送信へ載せる", async () => {
    const { container } = renderWithCoupon();

    await userEvent.click(screen.getByRole("button", { name: "クーポンを選ぶ" }));

    expect(container.querySelector(`input[name="${COUPON_ID_FIELD}"]`)).toHaveValue(COUPON.id);
  });

  it("使わないを選び直したら、送信へクーポンを載せない", async () => {
    const { container } = renderWithCoupon();

    await userEvent.click(screen.getByRole("button", { name: "クーポンを選ぶ" }));
    await userEvent.click(screen.getByRole("button", { name: "使わないを選ぶ" }));

    expect(container.querySelector(`input[name="${COUPON_ID_FIELD}"]`)).not.toBeInTheDocument();
  });

  it("確かめを挟まない", () => {
    renderForm();

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
  it("確定できる明細が無ければ押せない", () => {
    renderForm(false);

    expect(screen.getByRole("button", { name: "注文を確定する" })).toBeDisabled();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderForm();

    expect((await axe(container)).violations).toEqual([]);
  });
});
