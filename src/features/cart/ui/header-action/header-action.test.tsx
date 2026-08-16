// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("../../actions", () => ({
  clearCartAction: vi.fn(),
  removeCartItemAction: vi.fn(),
  setCartItemQuantityAction: vi.fn(),
}));

const { useMediaQuery } = vi.hoisted(() => ({ useMediaQuery: vi.fn<() => boolean>() }));

vi.mock("@/capabilities/use-media-query", () => ({ useMediaQuery }));

import { mediaBelow } from "@/model/breakpoint";
import { useCartStore } from "@/stores/cart-store";

import { CART } from "../../cart.fixture";
import { CartHeaderAction } from "./header-action";

beforeEach(() => {
  vi.clearAllMocks();
  useMediaQuery.mockReturnValue(false);
  useCartStore.setState({ isOpen: false });
});

describe("CartHeaderAction", () => {
  it("脇に常設できる幅では、中身を被せずに要求だけを立てる", async () => {
    const user = userEvent.setup();

    render(<CartHeaderAction cart={CART} />);
    await user.click(screen.getByRole("button", { name: "カートを開く" }));

    expect(useCartStore.getState().isOpen).toBe(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("脇に常設できない幅では、本文へ中身を被せる", async () => {
    const user = userEvent.setup();

    useMediaQuery.mockReturnValue(true);

    render(<CartHeaderAction cart={CART} />);
    await user.click(screen.getByRole("button", { name: /カートを開く/ }));

    expect(await screen.findByRole("dialog")).toBeVisible();
  });

  it("どちらの姿でも点数は 1 か所だけに出す", () => {
    render(<CartHeaderAction cart={CART} />);

    expect(screen.getAllByText(String(CART.lines.length))).toHaveLength(1);
  });

  it("帯の判定は脇に置ける幅の境界で行う", () => {
    render(<CartHeaderAction cart={CART} />);

    expect(useMediaQuery).toHaveBeenCalledWith(mediaBelow("lg"));
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<CartHeaderAction cart={CART} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
