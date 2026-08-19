// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError, findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

const { getMyPurchase, readReferenceAmount, notFound } = vi.hoisted(() => ({
  getMyPurchase: vi.fn(),
  readReferenceAmount: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/adapters/server/api/purchases", () => ({ getMyPurchase }));
vi.mock("@/adapters/server/api/exchange-rates", () => ({ readReferenceAmount }));
vi.mock("next/navigation", () => ({ notFound }));

import { PURCHASE_DETAIL, TOTAL_REFERENCE } from "../facade/purchase.fixture";
import { PurchaseDetailPageContent } from "./page-content";

beforeEach(() => {
  vi.clearAllMocks();
  getMyPurchase.mockResolvedValue(PURCHASE_DETAIL);
  readReferenceAmount.mockResolvedValue(TOTAL_REFERENCE);
});

describe("PurchaseDetailPageContent", () => {
  it("受け取った識別子で購入を引く", async () => {
    render(await PurchaseDetailPageContent({ purchaseId: "0195f0c2" }));

    expect(getMyPurchase).toHaveBeenCalledWith("0195f0c2");
    expect(screen.getByText("2026/08/17 10:30")).toBeVisible();
  });

  it("合計の参考換算額を引いて渡す", async () => {
    render(await PurchaseDetailPageContent({ purchaseId: "0195f0c2" }));

    expect(readReferenceAmount).toHaveBeenCalledWith(PURCHASE_DETAIL.totalAmount);
    expect(screen.getByRole("button", { name: "円で見る" })).toBeVisible();
  });

  it("参考換算額を引けなくても購入は出す", async () => {
    readReferenceAmount.mockResolvedValue(null);

    render(await PurchaseDetailPageContent({ purchaseId: "0195f0c2" }));

    expect(screen.getByText("2026/08/17 10:30")).toBeVisible();
    expect(screen.queryByRole("button", { name: "円で見る" })).not.toBeInTheDocument();
  });

  it("見つからない購入は not-found の境界へ渡す", async () => {
    getMyPurchase.mockRejectedValue(createAppError(ErrorKind.NOT_FOUND));

    await expect(PurchaseDetailPageContent({ purchaseId: "無い" })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("見つからない以外の失敗は分類のまま投げ直す", async () => {
    getMyPurchase.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    await expect(PurchaseDetailPageContent({ purchaseId: "x" })).rejects.toSatisfy(
      (error: unknown) => findAppError(error)?.kind === ErrorKind.UNAVAILABLE,
    );
    expect(notFound).not.toHaveBeenCalled();
  });

  it("購入が見つからないとき、換算の取得を始めない", async () => {
    getMyPurchase.mockRejectedValue(createAppError(ErrorKind.NOT_FOUND));

    await expect(PurchaseDetailPageContent({ purchaseId: "無い" })).rejects.toThrow();
    expect(readReferenceAmount).not.toHaveBeenCalled();
  });
});
