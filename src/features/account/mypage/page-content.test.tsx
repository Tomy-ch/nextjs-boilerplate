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
    expect(screen.getByRole("row", { name: /合計/ })).toHaveTextContent("11 件");
    expect(screen.getByRole("button", { name: "もっと見る" })).toBeEnabled();
  });

  it("履歴を開く前に、契約の既定と同じ件数だけ先に取る", async () => {
    render(await MypagePageContent());

    expect(getMyPurchases).toHaveBeenCalledWith({ first: 50, period: "all" });
  });

  it("互いに依存しない 3 系統を並行で取る", async () => {
    let releaseProfile: (() => void) | undefined;

    // 先頭の取得を止めたまま、後ろの 2 つが既に出ているかを見る。呼び出しの「順序」を見ると
    // 逐次 await でも同じ順に並ぶため、並行と逐次を区別できない。
    getMyProfile.mockReturnValue(
      new Promise((resolve) => {
        releaseProfile = () => resolve(PROFILE);
      }),
    );

    const rendered = MypagePageContent();

    await Promise.resolve();

    expect(getMyPurchaseSummary).toHaveBeenCalled();
    expect(getMyPurchases).toHaveBeenCalled();

    releaseProfile?.();
    render(await rendered);

    expect(screen.getByText("山田 太郎")).toBeVisible();
  });

  it("どれか 1 つでも失敗したら組み立てず、分類のまま投げる", async () => {
    getMyPurchaseSummary.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    await expect(MypagePageContent()).rejects.toMatchObject({ kind: ErrorKind.UNAVAILABLE });
  });
});
