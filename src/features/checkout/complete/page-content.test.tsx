// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError, findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

const { convertToReferenceAmount, getMyPurchase, notFound } = vi.hoisted(() => ({
  convertToReferenceAmount: vi.fn(),
  getMyPurchase: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/adapters/server/api/purchases", () => ({ getMyPurchase }));
vi.mock("@/adapters/server/api/exchange-rates", () => ({ convertToReferenceAmount }));
vi.mock("next/navigation", () => ({ notFound }));

import { PURCHASE, TOTAL_REFERENCE } from "../checkout.fixture";
import { PURCHASE_PARAM } from "../paths";
import { CheckoutCompletePageContent } from "./page-content";

const searchParams = { [PURCHASE_PARAM]: PURCHASE.id };

beforeEach(() => {
  vi.clearAllMocks();
  getMyPurchase.mockResolvedValue(PURCHASE);
  convertToReferenceAmount.mockResolvedValue(TOTAL_REFERENCE);
});

describe("CheckoutCompletePageContent", () => {
  // ----- 正常系 -----
  it("URL が指す購入を取り直して描く", async () => {
    render(await CheckoutCompletePageContent({ searchParams }));

    expect(getMyPurchase).toHaveBeenCalledWith(PURCHASE.id);
    expect(screen.getByText(PURCHASE.code)).toBeVisible();
  });

  it("合計の参考換算額を、合計の金額から引く", async () => {
    render(await CheckoutCompletePageContent({ searchParams }));

    expect(convertToReferenceAmount).toHaveBeenCalledWith(PURCHASE.totalAmount);
  });

  // ----- 異常系 -----
  it("指し先が読めなければ見つからないにする", async () => {
    await expect(CheckoutCompletePageContent({ searchParams: {} })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(getMyPurchase).not.toHaveBeenCalled();
  });

  it("他人の購入と存在しない購入を、区別せず見つからないにする", async () => {
    getMyPurchase.mockRejectedValue(createAppError(ErrorKind.NOT_FOUND));

    await expect(CheckoutCompletePageContent({ searchParams })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("それ以外の失敗は握り潰さず境界へ渡す", async () => {
    getMyPurchase.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    await expect(CheckoutCompletePageContent({ searchParams })).rejects.toSatisfy(
      (error: unknown) => findAppError(error)?.kind === ErrorKind.UNAVAILABLE,
    );
  });

  it("参考換算額を引けなくても描く", async () => {
    convertToReferenceAmount.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    render(await CheckoutCompletePageContent({ searchParams }));

    expect(screen.queryByRole("button", { name: "円で見る" })).not.toBeInTheDocument();
    expect(screen.getByText("$212.87")).toBeVisible();
  });
});
