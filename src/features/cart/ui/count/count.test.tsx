// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { type CartLineInput, useCartStore } from "@/stores/cart-store";
import { CartCount } from "./count";

const COFFEE: CartLineInput = {
  productId: "0195f0c2-0000-7000-8000-000000000001",
  name: "深煎りブレンド",
  price: "12.34",
  statusName: "公開中",
  imageUrl: null,
  stockQuantity: 20,
};

describe("CartCount", () => {
  beforeEach(() => {
    useCartStore.setState({ lines: [] });
  });

  // ----- 正常系 -----
  it("カートの点数を出す", () => {
    useCartStore.getState().add(COFFEE);
    useCartStore.getState().add({ ...COFFEE, productId: "other", name: "煎茶" });
    render(<CartCount />);

    expect(screen.getByText("2")).toBeVisible();
  });

  it("同じ商品を複数入れても点数は増やさない", () => {
    useCartStore.getState().add(COFFEE);
    useCartStore.getState().add(COFFEE);
    render(<CartCount />);

    expect(screen.getByText("1")).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    useCartStore.getState().add(COFFEE);
    const { container } = render(<CartCount />);

    expect((await axe(container)).violations).toEqual([]);
  });

  it("カートが空なら数字を出さない", () => {
    render(<CartCount />);

    expect(screen.getByText("カート")).toBeVisible();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
