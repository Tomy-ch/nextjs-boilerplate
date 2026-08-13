// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

import { type CartLineInput, useCartStore } from "@/stores/cart-store";
import ShopLayout from "./layout";

const COFFEE: CartLineInput = {
  productId: "0195f0c2-0000-7000-8000-000000000001",
  name: "深煎りブレンド",
  price: "12.34",
  statusName: "公開中",
  imageUrl: null,
  stockQuantity: 20,
};

describe("ShopLayout", () => {
  beforeEach(() => {
    useCartStore.setState({ lines: [], isOpen: false });
  });

  // ----- 正常系 -----
  it("利用者向けの外枠へ子要素を入れる", () => {
    render(
      <ShopLayout>
        <p>テスト用コンテンツ</p>
      </ShopLayout>,
    );

    expect(within(screen.getByRole("main")).getByText("テスト用コンテンツ")).toBeVisible();
  });

  it("商品への導線を持つ", () => {
    render(
      <ShopLayout>
        <p>本文</p>
      </ShopLayout>,
    );

    expect(screen.getByRole("link", { name: "商品" })).toHaveAttribute("href", "/products");
  });

  it("カートの入口を header に置く", () => {
    render(
      <ShopLayout>
        <p>本文</p>
      </ShopLayout>,
    );

    expect(
      within(screen.getByRole("banner")).getByRole("button", { name: "カートを開く" }),
    ).toBeVisible();
  });

  it("カートの中身を本文の脇に置く", () => {
    useCartStore.getState().add(COFFEE);
    render(
      <ShopLayout>
        <p>本文</p>
      </ShopLayout>,
    );
    const cart = screen.getByRole("complementary", { name: "カート" });

    expect(cart).toBeVisible();
    expect(within(screen.getByRole("banner")).queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("header の入口と脇の領域が同じ要求を読む", async () => {
    useCartStore.getState().add(COFFEE);
    render(
      <ShopLayout>
        <p>本文</p>
      </ShopLayout>,
    );

    await userEvent.click(
      within(screen.getByRole("banner")).getByRole("button", { name: "カートを閉じる" }),
    );

    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("カートが空なら脇の領域を出さない", () => {
    render(
      <ShopLayout>
        <p>本文</p>
      </ShopLayout>,
    );

    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });
});
