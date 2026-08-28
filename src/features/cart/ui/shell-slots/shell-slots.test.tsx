// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh: () => {} }),
}));
vi.mock("@/features/cart/actions", () => ({
  clearCartAction: vi.fn(),
  removeCartItemAction: vi.fn(),
  setCartItemQuantityAction: vi.fn(),
}));

const { getMyCart, useMediaQuery } = vi.hoisted(() => ({
  getMyCart: vi.fn(),
  useMediaQuery: vi.fn<() => boolean>(),
}));

vi.mock("@/adapters/server/api/cart", () => ({ getMyCart }));
vi.mock("@/logging/logging.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/logging/logging.server")>()),
  getLogger: () => ({ warn: vi.fn() }),
}));
vi.mock("@/capabilities/use-media-query", () => ({ useMediaQuery }));

import { CART, EMPTY_CART } from "@/features/cart/cart.fixture";
import { useCartStore } from "@/stores/cart-store";

import { CartHeaderSlot, CartPanelSlot } from "./shell-slots";

// カートの中身は `next/dynamic` で読まれる。先に解決しておかないと、要素を待つ時間の中に module の
// 読み込みが入る（`docs/testing-conventions.md`「`next/dynamic` を含む木を描くとき」）。
beforeAll(async () => {
  await import("@/features/cart/ui/contents/contents");
});

beforeEach(() => {
  vi.clearAllMocks();
  getMyCart.mockResolvedValue(CART);
  useMediaQuery.mockReturnValue(false);
  useCartStore.setState({ isOpen: true });
});

describe("CartHeaderSlot", () => {
  it("カートの入口を出す", async () => {
    render(await CartHeaderSlot());

    expect(screen.getByRole("button", { name: "カートを閉じる" })).toBeVisible();
  });

  it("カートを読めなかったときは何も出さない", async () => {
    getMyCart.mockRejectedValue(new Error("上流が応答しません"));

    const { container } = render(await CartHeaderSlot());

    expect(container).toBeEmptyDOMElement();
  });

  it("a11y 違反を持たない", async () => {
    const { container } = render(await CartHeaderSlot());

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

describe("CartPanelSlot", () => {
  // ----- 中身があるとき -----
  it("カートの中身を本文の脇へ出す", async () => {
    render(await CartPanelSlot());

    const cart = screen.getByRole("complementary", { name: "カート" });

    expect(getMyCart).toHaveBeenCalledOnce();
    expect(await within(cart).findByText("小計")).toBeVisible();
  });

  it("a11y 違反を持たない", async () => {
    const { container } = render(await CartPanelSlot());

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  // ----- 空のとき -----
  it("カートが空なら脇の領域を出さない", async () => {
    getMyCart.mockResolvedValue(EMPTY_CART);

    render(await CartPanelSlot());

    expect(screen.queryByRole("complementary", { name: "カート" })).not.toBeInTheDocument();
  });

  // ----- 読めなかったとき -----
  it("カートを読めなかったときは何も出さない", async () => {
    getMyCart.mockRejectedValue(new Error("上流が応答しません"));

    const { container } = render(await CartPanelSlot());

    expect(container).toBeEmptyDOMElement();
  });
});
