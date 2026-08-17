// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError, findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

const { getMyCart } = vi.hoisted(() => ({ getMyCart: vi.fn() }));

vi.mock("@/adapters/server/api/cart", () => ({ getMyCart }));
vi.mock("./actions", () => ({
  clearCartAction: vi.fn(),
  removeCartItemAction: vi.fn(),
  setCartItemQuantityAction: vi.fn(),
}));

import { CART, EMPTY_CART } from "./cart.fixture";
import { CartPageContent } from "./page-content";

beforeEach(() => {
  vi.clearAllMocks();
  getMyCart.mockResolvedValue(CART);
});

describe("CartPageContent", () => {
  it("取得したカートを画面へ渡す", async () => {
    render(await CartPageContent());

    expect(screen.getByRole("region", { name: "カートの明細" })).toBeVisible();
    expect(screen.getAllByText("$188.97").length).toBeGreaterThan(0);
  });

  it("空のカートでも組み立てる", async () => {
    getMyCart.mockResolvedValue(EMPTY_CART);

    render(await CartPageContent());

    expect(screen.getByText("カートに商品が入っていません。")).toBeVisible();
  });

  it("取得に失敗したとき、握り潰さず境界へ渡す", async () => {
    getMyCart.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    await expect(CartPageContent()).rejects.toSatisfy(
      (error: unknown) => findAppError(error)?.kind === ErrorKind.UNAVAILABLE,
    );
  });
});
