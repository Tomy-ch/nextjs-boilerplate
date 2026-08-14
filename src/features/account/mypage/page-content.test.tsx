// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

const { getMyProfile, getMyPurchaseSummary, getMyPurchases } = vi.hoisted(() => ({
  getMyProfile: vi.fn(),
  getMyPurchaseSummary: vi.fn(),
  getMyPurchases: vi.fn(),
}));

vi.mock("@/adapters/server/api/users", () => ({ getMyProfile, getMyPurchaseSummary }));
vi.mock("@/adapters/server/api/purchases", () => ({ getMyPurchases }));

import { PROFILE, PURCHASE_HISTORY, PURCHASE_SUMMARY } from "../account.fixture";
import { MypagePageContent } from "./page-content";

beforeEach(() => {
  getMyProfile.mockReset().mockResolvedValue(PROFILE);
  getMyPurchaseSummary.mockReset().mockResolvedValue(PURCHASE_SUMMARY);
  getMyPurchases.mockReset().mockResolvedValue(PURCHASE_HISTORY);
});

describe("MypagePageContent", () => {
  it("3 系統の取得結果を 1 つの画面へ組み立てる", async () => {
    render(await MypagePageContent());

    expect(screen.getByText("山田 太郎")).toBeVisible();
    expect(screen.getByRole("row", { name: /合計/ })).toHaveTextContent("12 件");
    expect(screen.getByRole("button", { name: "もっと見る" })).toBeEnabled();
  });

  it("履歴を開く前に、契約の既定と同じ件数だけ先に取る", async () => {
    render(await MypagePageContent());

    expect(getMyPurchases).toHaveBeenCalledWith(50);
  });

  it("互いに依存しない 3 系統を並行で取る", async () => {
    const order: string[] = [];

    getMyProfile.mockImplementation(async () => {
      order.push("profile:start");

      return PROFILE;
    });
    getMyPurchases.mockImplementation(async () => {
      order.push("purchases:start");

      return PURCHASE_HISTORY;
    });

    render(await MypagePageContent());

    expect(order).toEqual(["profile:start", "purchases:start"]);
  });

  it("どれか 1 つでも失敗したら組み立てず、分類のまま投げる", async () => {
    getMyPurchaseSummary.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    await expect(MypagePageContent()).rejects.toMatchObject({ kind: ErrorKind.UNAVAILABLE });
  });
});
