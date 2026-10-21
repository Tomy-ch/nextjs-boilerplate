// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("../../../actions", () => ({ placeOrderAction: vi.fn() }));

import type { CartCoupon } from "@/model/coupon/coupon";
import { formatMoney } from "@/model/money";

import {
  BLOCKED_CART,
  CART_COUPONS,
  ORDERABLE_CART,
  PARTIALLY_ORDERABLE_CART,
  SUBTOTAL_REFERENCE,
} from "../../../checkout.fixture";
import { CouponChoice, CouponChoices } from "../coupon-choices/coupon-choices";
import { PlaceOrderStateProvider } from "../place-order-state/place-order-state";
import { OrderSummary } from "./order-summary";

const KEY = "0195f0c2-0000-7000-a000-000000000001";
const ESTIMATE_LABEL = "クーポン値引き（見込み）";

/** 送信の状態は画面が 1 つだけ持つ。実画面と同じ位置に器を置いて描く。 */
function renderSummary(ui: ReactNode, coupons: readonly CartCoupon[] | null = null) {
  return render(
    <PlaceOrderStateProvider coupons={coupons} idempotencyKey={KEY}>
      {ui}
    </PlaceOrderStateProvider>,
  );
}

describe("OrderSummary", () => {
  // ----- 事情の無いカートのとき -----
  it("小計と、税と送料がいつ決まるかを出す", () => {
    renderSummary(<OrderSummary cart={ORDERABLE_CART} reference={null} />);

    expect(screen.getByText("$188.97")).toBeVisible();
    expect(screen.getByText("税と送料は、注文を確定した時点で決まります。")).toBeVisible();
  });

  it("参考換算額を受け取れば切り替えを出す", () => {
    renderSummary(<OrderSummary cart={ORDERABLE_CART} reference={SUBTOTAL_REFERENCE} />);

    expect(screen.getByRole("button", { name: "円で見る" })).toBeVisible();
  });

  it("事情の無いカートでは、注記を増やさない", () => {
    renderSummary(<OrderSummary cart={ORDERABLE_CART} reference={null} />);

    expect(screen.queryByText(/外れます|確かめます/)).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderSummary(
      <OrderSummary cart={ORDERABLE_CART} reference={SUBTOTAL_REFERENCE} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });

  // ----- 金額が変わった明細があるとき -----
  it("金額が変わった明細があるとき、押すと確かめる面を出す", async () => {
    const user = userEvent.setup();

    renderSummary(<OrderSummary cart={PARTIALLY_ORDERABLE_CART} reference={null} />);

    expect(
      screen.getByText("金額の変わった明細は小計に入っていません。確定のときに確かめます。"),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "注文を確定する" }));

    expect(await screen.findByRole("alertdialog")).toBeVisible();
  });

  // ----- 買えない明細があるとき -----
  it("買えない明細があるとき、外れることを添える", () => {
    renderSummary(<OrderSummary cart={PARTIALLY_ORDERABLE_CART} reference={null} />);

    expect(screen.getByText("買えない明細は今回の購入から外れます。")).toBeVisible();
  });

  // ----- 確定できる明細が無いとき -----
  it("確定できる明細が無ければ押せない", () => {
    renderSummary(<OrderSummary cart={BLOCKED_CART} reference={null} />);

    expect(screen.getByRole("button", { name: "注文を確定する" })).toBeDisabled();
  });

  // ----- クーポンの候補があるとき -----
  it("クーポンを選んでいなければ、値引きの見込みを出さない", () => {
    renderSummary(<OrderSummary cart={ORDERABLE_CART} reference={null} />, CART_COUPONS);

    expect(screen.queryByText(ESTIMATE_LABEL)).not.toBeInTheDocument();
  });

  it("クーポンを選ぶと値引きの見込みを別の行に出し、小計からは差し引かない", async () => {
    const user = userEvent.setup();
    const coupon = CART_COUPONS[1];

    if (coupon === undefined) throw new Error("クーポンの候補が無い");

    renderSummary(
      <>
        <CouponChoices title="クーポン">
          <CouponChoice couponId={coupon.id}>選ぶクーポン</CouponChoice>
        </CouponChoices>
        <OrderSummary cart={ORDERABLE_CART} reference={null} />
      </>,
      CART_COUPONS,
    );
    await user.click(screen.getByRole("radio", { name: "選ぶクーポン" }));

    expect(screen.getByText(ESTIMATE_LABEL)).toBeVisible();
    expect(screen.getByText(formatMoney(-coupon.discountAmount))).toBeVisible();
    expect(screen.getByText(formatMoney(ORDERABLE_CART.subtotalAmount))).toBeVisible();
    expect(
      screen.queryByText(formatMoney(ORDERABLE_CART.subtotalAmount - coupon.discountAmount)),
    ).not.toBeInTheDocument();
  });
});
