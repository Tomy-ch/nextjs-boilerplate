// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("../actions", () => ({ placeOrderAction: vi.fn() }));

import { EMPTY_CART, ORDERABLE_CART, PROFILE, SUBTOTAL_REFERENCE } from "../checkout.fixture";
import { CheckoutConfirmView } from "./view";

const KEY = "0195f0c2-0000-7000-a000-000000000001";

function renderView(cart = ORDERABLE_CART) {
  return render(
    <CheckoutConfirmView
      cart={cart}
      idempotencyKey={KEY}
      profile={PROFILE}
      reference={SUBTOTAL_REFERENCE}
    />,
  );
}

describe("CheckoutConfirmView", () => {
  it("届け先と注文内容を並べる", () => {
    renderView();

    expect(screen.getByText("お届け先")).toBeVisible();
    expect(screen.getByText("ご注文内容（全 2 件）")).toBeVisible();
  });

  it("集計を脇と下端の 2 か所へ置く", () => {
    const { container } = renderView();

    expect(screen.getByRole("complementary", { name: "お支払い金額" }).tagName).toBe("ASIDE");
    expect(container.querySelector('[data-slot="action-bar"]')).toBeInTheDocument();
  });

  it("同じ名前の区画を 2 つ名乗らない", () => {
    renderView();

    expect(screen.getAllByRole("complementary", { name: "お支払い金額" })).toHaveLength(1);
  });
  it("カートが空なら、確かめる対象が無いことと商品を探す導線を出す", () => {
    renderView(EMPTY_CART);

    expect(screen.getByText(/確定できる注文がありません/)).toBeVisible();
    expect(screen.getByRole("link", { name: "商品を探す" })).toHaveAttribute("href", "/products");
  });

  it("カートが空なら確定の操作を出さない", () => {
    renderView(EMPTY_CART);

    expect(screen.queryByRole("button", { name: "注文を確定する" })).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderView();

    expect((await axe(container)).violations).toEqual([]);
  });
});
