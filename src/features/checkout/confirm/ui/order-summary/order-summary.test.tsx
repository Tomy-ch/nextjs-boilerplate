// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("../../../actions", () => ({ placeOrderAction: vi.fn() }));

import {
  BLOCKED_CART,
  ORDERABLE_CART,
  PARTIALLY_ORDERABLE_CART,
  SUBTOTAL_REFERENCE,
} from "../../../checkout.fixture";
import { OrderSummary } from "./order-summary";

const KEY = "0195f0c2-0000-7000-a000-000000000001";

describe("OrderSummary", () => {
  // ----- 正常系 -----
  it("小計と、税と送料がいつ決まるかを出す", () => {
    render(<OrderSummary cart={ORDERABLE_CART} idempotencyKey={KEY} reference={null} />);

    expect(screen.getByText("$188.97")).toBeVisible();
    expect(screen.getByText("税と送料は、注文を確定した時点で決まります。")).toBeVisible();
  });

  it("参考換算額を受け取れば切り替えを出す", () => {
    render(
      <OrderSummary cart={ORDERABLE_CART} idempotencyKey={KEY} reference={SUBTOTAL_REFERENCE} />,
    );

    expect(screen.getByRole("button", { name: "円で見る" })).toBeVisible();
  });

  it("事情の無いカートでは、注記を増やさない", () => {
    render(<OrderSummary cart={ORDERABLE_CART} idempotencyKey={KEY} reference={null} />);

    expect(screen.queryByText(/外れます|確かめます/)).not.toBeInTheDocument();
  });

  it("金額が変わった明細があるとき、確かめる姿の操作を出す", () => {
    render(<OrderSummary cart={PARTIALLY_ORDERABLE_CART} idempotencyKey={KEY} reference={null} />);

    expect(
      screen.getByText("金額の変わった明細は小計に入っていません。確定のときに確かめます。"),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "注文を確定する" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("買えない明細があるとき、外れることを添える", () => {
    render(<OrderSummary cart={PARTIALLY_ORDERABLE_CART} idempotencyKey={KEY} reference={null} />);

    expect(screen.getByText("買えない明細は今回の購入から外れます。")).toBeVisible();
  });

  // ----- 異常系 -----
  it("確定できる明細が無ければ押せない", () => {
    render(<OrderSummary cart={BLOCKED_CART} idempotencyKey={KEY} reference={null} />);

    expect(screen.getByRole("button", { name: "注文を確定する" })).toBeDisabled();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <OrderSummary cart={ORDERABLE_CART} idempotencyKey={KEY} reference={SUBTOTAL_REFERENCE} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
