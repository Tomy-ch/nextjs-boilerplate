// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));
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

import ShopLayout from "./layout";

/** 外枠を組み立てる。取得は server 側で済むため、await してから描く。 */
async function renderLayout(children = <p>本文</p>) {
  return render(await ShopLayout({ children }));
}

beforeEach(() => {
  vi.clearAllMocks();
  getMyCart.mockResolvedValue(CART);
  useMediaQuery.mockReturnValue(false);
  useCartStore.setState({ isOpen: true });
});

describe("ShopLayout", () => {
  it("利用者向けの外枠へ子要素を入れる", async () => {
    await renderLayout(<p>テスト用コンテンツ</p>);

    expect(within(screen.getByRole("main")).getByText("テスト用コンテンツ")).toBeVisible();
  });

  it("商品への導線を持つ", async () => {
    await renderLayout();

    expect(screen.getByRole("link", { name: "商品" })).toHaveAttribute("href", "/products");
  });

  it("カートの入口を header に置く", async () => {
    await renderLayout();

    expect(
      within(screen.getByRole("banner")).getByRole("button", { name: "カートを閉じる" }),
    ).toBeVisible();
  });

  it("カートの中身をサーバから取り、本文の脇に置く", async () => {
    await renderLayout();

    const cart = screen.getByRole("complementary", { name: "カート" });

    expect(getMyCart).toHaveBeenCalledOnce();
    expect(await within(cart).findByText("小計")).toBeVisible();
  });

  it("header の入口と脇の領域が同じ要求を読む", async () => {
    const user = userEvent.setup();

    await renderLayout();
    await user.click(
      within(screen.getByRole("banner")).getByRole("button", { name: "カートを閉じる" }),
    );

    expect(screen.queryByRole("complementary", { name: "カート" })).not.toBeInTheDocument();
  });

  it("カートが空なら脇の領域を出さない", async () => {
    getMyCart.mockResolvedValue(EMPTY_CART);

    await renderLayout();

    expect(screen.queryByRole("complementary", { name: "カート" })).not.toBeInTheDocument();
  });

  it("カートを読めなかったとき、カートを出さずに本文を出す", async () => {
    getMyCart.mockRejectedValue(new Error("上流が応答しません"));

    await renderLayout(<p>本文</p>);

    expect(screen.getByText("本文")).toBeVisible();
    expect(screen.getByRole("link", { name: "商品" })).toBeVisible();
    expect(screen.queryByRole("complementary", { name: "カート" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /カートを/ })).not.toBeInTheDocument();
  });

  it("a11y 違反を持たない", async () => {
    const { container } = await renderLayout(<p>テスト用コンテンツ</p>);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
