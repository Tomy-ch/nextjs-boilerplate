// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { BUTTON_SIZE } from "@/components/design-system/action/button/button.definition";

import { CART, CART_WITHOUT_PURCHASABLE, EMPTY_CART } from "../../cart.fixture";
import { CartCheckoutLink } from "./checkout-link";

describe("CartCheckoutLink", () => {
  it("買える明細があるとき、購入手続きへの導線にする", () => {
    render(<CartCheckoutLink cart={CART} />);

    expect(screen.getByRole("link", { name: "購入手続きへ" })).toHaveAttribute("href", "/checkout");
  });

  it("買える明細が無いとき、押せない操作にして導線を出さない", () => {
    render(<CartCheckoutLink cart={CART_WITHOUT_PURCHASABLE} />);

    expect(screen.getByRole("button", { name: "購入手続きへ" })).toBeDisabled();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("空のカートでは押せない操作にする", () => {
    render(<CartCheckoutLink cart={EMPTY_CART} />);

    expect(screen.getByRole("button", { name: "購入手続きへ" })).toBeDisabled();
  });

  it("器に合わせた大きさを受け取る", () => {
    render(<CartCheckoutLink cart={CART} size={BUTTON_SIZE.SMALL} />);

    expect(screen.getByRole("link", { name: "購入手続きへ" })).toHaveClass("h-8");
  });

  it("大きさを渡さないとき、既定の大きさで出す", () => {
    render(<CartCheckoutLink cart={CART} />);

    expect(screen.getByRole("link", { name: "購入手続きへ" })).toHaveClass("h-10");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<CartCheckoutLink cart={CART} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
