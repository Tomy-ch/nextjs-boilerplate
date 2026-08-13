// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { type CartLineInput, useCartStore } from "@/stores/cart-store";
import { AddToCartButton } from "./add-to-cart-button";

const LINE: CartLineInput = {
  productId: "0195f0c2-0000-7000-8000-000000000001",
  name: "深煎りブレンド",
  price: "12.34",
  statusName: "公開中",
  imageUrl: null,
  stockQuantity: 20,
};

describe("AddToCartButton", () => {
  beforeEach(() => {
    useCartStore.setState({ lines: [] });
  });

  // ----- 正常系 -----
  it("押すとカートへ 1 行入る", async () => {
    render(<AddToCartButton line={LINE} />);

    await userEvent.click(screen.getByRole("button", { name: "カートに追加" }));

    expect(useCartStore.getState().lines).toEqual([{ ...LINE, quantity: 1 }]);
  });

  it("同じ商品を続けて押すと数量が上がる", async () => {
    render(<AddToCartButton line={LINE} />);

    await userEvent.click(screen.getByRole("button", { name: "カートに追加" }));
    await userEvent.click(screen.getByRole("button", { name: "カートに追加" }));

    expect(useCartStore.getState().lines).toHaveLength(1);
    expect(useCartStore.getState().lines[0]?.quantity).toBe(2);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<AddToCartButton line={LINE} />);

    expect((await axe(container)).violations).toEqual([]);
  });

  it("在庫数を超えて押しても数量は在庫数で止まる", async () => {
    render(<AddToCartButton line={{ ...LINE, stockQuantity: 1 }} />);
    const button = screen.getByRole("button", { name: "カートに追加" });

    await userEvent.click(button);

    expect(button).toBeDisabled();

    await userEvent.click(button);

    expect(useCartStore.getState().lines[0]?.quantity).toBe(1);
  });

  it("在庫ぶんすべて入っていれば押せなくする", async () => {
    render(<AddToCartButton line={{ ...LINE, stockQuantity: 1 }} />);

    await userEvent.click(screen.getByRole("button", { name: "カートに追加" }));

    expect(screen.getByRole("button", { name: "カートに追加" })).toBeDisabled();
  });

  it("在庫が無い商品では押せない", () => {
    render(<AddToCartButton line={{ ...LINE, stockQuantity: 0 }} />);

    expect(screen.getByRole("button", { name: "カートに追加" })).toBeDisabled();
  });
});
