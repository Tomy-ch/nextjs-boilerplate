// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback } from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("../../../actions", () => ({ placeOrderAction: vi.fn() }));

import { type CartCoupon, type CouponId, toCouponId } from "@/model/coupon/coupon";
import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";

import { ACCEPT_PRICE_CHANGE_FIELD, COUPON_ID_FIELD } from "../../../form-fields";
import {
  PlaceOrderStateProvider,
  usePlaceOrderState,
} from "../place-order-state/place-order-state";
import { PriceChangeConfirm } from "./price-change-confirm";

const KEY = "0195f0c2-0000-7000-a000-000000000001";
const OTHER_KEY = "0195f0c2-0000-7000-a000-000000000002";
const NAMES = ["ノイズキャンセリングヘッドホン"];
const COUPON: CartCoupon = {
  id: toCouponId("0193a1c0-0001-7000-8000-000000000001"),
  discount: { kind: "flat", value: "5.00" },
  scopeKind: "all",
  discountAmount: 500,
  expiresAt: "2027-06-30T14:59:59Z",
};

function renderConfirm(orderable = true, idempotencyKey = KEY) {
  return render(
    <PlaceOrderStateProvider coupons={[]} idempotencyKey={idempotencyKey}>
      <PriceChangeConfirm changedNames={NAMES} orderable={orderable} />
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
    <PlaceOrderStateProvider coupons={[COUPON]} idempotencyKey={KEY}>
      <SelectCouponButton couponId={COUPON.id} label="クーポンを選ぶ" />
      <PriceChangeConfirm changedNames={NAMES} orderable />
    </PlaceOrderStateProvider>,
  );
}

async function open() {
  await userEvent.click(screen.getByRole("button", { name: "注文を確定する" }));
}

describe("PriceChangeConfirm", () => {
  it("押すまで確かめを出さない", () => {
    renderConfirm();

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("押すと、金額が変わったことと対象を出す", async () => {
    renderConfirm();

    await open();

    expect(screen.getByRole("alertdialog", { name: "金額が変わっています" })).toBeVisible();
    expect(screen.getByText(NAMES[0] ?? "")).toBeVisible();
  });

  it("出口を 3 つ置く", async () => {
    renderConfirm();

    await open();

    expect(screen.getByRole("button", { name: "はい" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "確認へ戻る" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "カートを修正する" })).toHaveAttribute("href", "/cart");
  });

  it("承知の合図と鍵を、確かめの中の送信へ載せる", async () => {
    renderConfirm();

    await open();

    const dialog = screen.getByRole("alertdialog");

    expect(dialog.querySelector(`input[name="${ACCEPT_PRICE_CHANGE_FIELD}"]`)).toHaveValue("1");
    expect(dialog.querySelector(`input[name="${IDEMPOTENCY_KEY_FIELD}"]`)).toHaveValue(KEY);
  });

  it("選んだクーポンを、承知の合図と一緒に確かめの中の送信へ載せる", async () => {
    renderWithCoupon();

    await userEvent.click(screen.getByRole("button", { name: "クーポンを選ぶ" }));
    await open();

    const dialog = screen.getByRole("alertdialog");

    expect(dialog.querySelector(`input[name="${COUPON_ID_FIELD}"]`)).toHaveValue(COUPON.id);
    expect(dialog.querySelector(`input[name="${ACCEPT_PRICE_CHANGE_FIELD}"]`)).toHaveValue("1");
  });

  it("クーポンを選んでいなければ、確かめの中の送信へクーポンを載せない", async () => {
    renderWithCoupon();

    await open();

    expect(
      screen.getByRole("alertdialog").querySelector(`input[name="${COUPON_ID_FIELD}"]`),
    ).not.toBeInTheDocument();
  });

  it("組み直された画面から別の鍵が届いても、送信へ載せる鍵は変えない", async () => {
    const { rerender } = renderConfirm();

    await open();
    await userEvent.click(screen.getByRole("button", { name: "確認へ戻る" }));
    rerender(
      <PlaceOrderStateProvider coupons={[]} idempotencyKey={OTHER_KEY}>
        <PriceChangeConfirm changedNames={NAMES} orderable />
      </PlaceOrderStateProvider>,
    );
    await open();

    expect(
      screen.getByRole("alertdialog").querySelector(`input[name="${IDEMPOTENCY_KEY_FIELD}"]`),
    ).toHaveValue(KEY);
  });

  it("閉じるだけの操作で確かめから戻れる", async () => {
    renderConfirm();

    await open();
    await userEvent.click(screen.getByRole("button", { name: "確認へ戻る" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
  it("確定できる明細が無ければ、確かめを開けない", () => {
    renderConfirm(false);

    expect(screen.getByRole("button", { name: "注文を確定する" })).toBeDisabled();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderConfirm();

    await open();

    expect((await axe(container)).violations).toEqual([]);
  });
});
