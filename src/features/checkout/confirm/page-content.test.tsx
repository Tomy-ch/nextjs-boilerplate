// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { createAppError, findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

const { readReferenceAmount, getMyCart, getMyProfile } = vi.hoisted(() => ({
  readReferenceAmount: vi.fn(),
  getMyCart: vi.fn(),
  getMyProfile: vi.fn(),
}));

vi.mock("@/adapters/server/api/cart", () => ({ getMyCart }));
vi.mock("@/adapters/server/api/users", () => ({ getMyProfile }));
vi.mock("@/adapters/server/api/exchange-rates", () => ({ readReferenceAmount }));
vi.mock("../actions", () => ({ placeOrderAction: vi.fn() }));

import { ORDERABLE_CART, PROFILE, SUBTOTAL_REFERENCE } from "../checkout.fixture";
import { CheckoutConfirmPageContent } from "./page-content";

beforeEach(() => {
  vi.clearAllMocks();
  getMyCart.mockResolvedValue(ORDERABLE_CART);
  getMyProfile.mockResolvedValue(PROFILE);
  readReferenceAmount.mockResolvedValue(SUBTOTAL_REFERENCE);
});

describe("CheckoutConfirmPageContent", () => {
  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(await CheckoutConfirmPageContent());

    expect((await axe(container)).violations).toEqual([]);
  });

  it("届け先と明細を組み立てる", async () => {
    render(await CheckoutConfirmPageContent());

    expect(screen.getByText("山田 太郎")).toBeVisible();
    expect(screen.getByText("ワイヤレスイヤホン")).toBeVisible();
  });

  it("小計の参考換算額を、小計の金額から引く", async () => {
    render(await CheckoutConfirmPageContent());

    expect(readReferenceAmount).toHaveBeenCalledWith(ORDERABLE_CART.subtotalAmount);
    // 集計は脇と下端の 2 か所へ置かれる（出るのは CSS で一方だけ）。
    expect(screen.getAllByRole("button", { name: "円で見る" })).toHaveLength(2);
  });

  it("画面を組み立てるたびに別の鍵を作る", async () => {
    const { container: first } = render(await CheckoutConfirmPageContent());
    const { container: second } = render(await CheckoutConfirmPageContent());

    const keyOf = (container: HTMLElement) =>
      container.querySelector<HTMLInputElement>('input[name="idempotencyKey"]')?.value;

    expect(keyOf(first)).not.toBe(keyOf(second));
  });
  it("参考換算額を引けなくても組み立てる", async () => {
    readReferenceAmount.mockResolvedValue(null);

    render(await CheckoutConfirmPageContent());

    expect(screen.queryByRole("button", { name: "円で見る" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "注文を確定する" })).toHaveLength(2);
  });

  it("カートを取得できないときは握り潰さず境界へ渡す", async () => {
    getMyCart.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    await expect(CheckoutConfirmPageContent()).rejects.toSatisfy(
      (error: unknown) => findAppError(error)?.kind === ErrorKind.UNAVAILABLE,
    );
  });

  it("登録情報を取得できないときも境界へ渡す", async () => {
    getMyProfile.mockRejectedValue(createAppError(ErrorKind.NOT_FOUND));

    await expect(CheckoutConfirmPageContent()).rejects.toSatisfy(
      (error: unknown) => findAppError(error)?.kind === ErrorKind.NOT_FOUND,
    );
  });
});
