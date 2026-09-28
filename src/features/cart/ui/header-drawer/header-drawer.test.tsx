// @vitest-environment jsdom

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("../../actions", () => ({
  clearCartAction: vi.fn(),
  removeCartItemAction: vi.fn(),
  setCartItemQuantityAction: vi.fn(),
}));

import { useCartStore } from "@/stores/cart-store";

import { CART, EMPTY_CART } from "../../cart.fixture";
import { CartHeaderDrawer } from "./header-drawer";

beforeEach(() => {
  useCartStore.setState({ isOpen: false });
});

describe("CartHeaderDrawer", () => {
  it("閉じているとき、引き手だけを出す", () => {
    render(<CartHeaderDrawer cart={CART} />);

    expect(screen.getByRole("button", { name: /カートを開く/ })).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("引き手に点数を出す", () => {
    render(<CartHeaderDrawer cart={CART} />);

    expect(screen.getByText(String(CART.lines.length))).toBeVisible();
  });

  it("押すと中身を開く", async () => {
    const user = userEvent.setup();

    render(<CartHeaderDrawer cart={CART} />);
    await user.click(screen.getByRole("button", { name: /カートを開く/ }));

    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByText("カート")).toBeVisible();
  });

  it("開いた中身に何点入っているかを添える", async () => {
    useCartStore.setState({ isOpen: true });

    render(<CartHeaderDrawer cart={CART} />);

    expect(await screen.findByText(`${CART.lines.length} 点入っています。`)).toBeVisible();
  });

  it("空のカートでは、入っていないことを添える", async () => {
    useCartStore.setState({ isOpen: true });

    render(<CartHeaderDrawer cart={EMPTY_CART} />);

    expect(await screen.findByText("商品が入っていません。")).toBeVisible();
  });

  it("閉じる操作で中身を閉じる", async () => {
    const user = userEvent.setup();

    useCartStore.setState({ isOpen: true });
    render(<CartHeaderDrawer cart={CART} />);

    const dialog = await screen.findByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: "閉じる" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("a11y 自動検査に違反しない", async () => {
    useCartStore.setState({ isOpen: true });

    const { baseElement } = render(<CartHeaderDrawer cart={CART} />);

    await screen.findByRole("dialog");

    expect((await axe(baseElement)).violations).toEqual([]);
  });
});
