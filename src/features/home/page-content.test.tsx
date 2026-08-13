// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import type { CursorPage } from "@/model/pagination";
import type { ProductListItem, ProductRankingEntry, ProductRef } from "@/model/product/product";

const { getProductListPage, getProductRanking } = vi.hoisted(() => ({
  getProductListPage: vi.fn(),
  getProductRanking: vi.fn(),
}));
const { getProductCategories } = vi.hoisted(() => ({ getProductCategories: vi.fn() }));

vi.mock("@/adapters/server/api/products", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/products")>()),
  getProductListPage,
  getProductRanking,
}));
vi.mock("@/adapters/server/api/product-masters", () => ({ getProductCategories }));

import { HomePageContent } from "./page-content";

const ITEM: ProductListItem = {
  id: "0195f0c2-0000-7000-8000-000000000001",
  name: "ワイヤレスイヤホン",
  price: "19.99",
  quantity: 12,
  categoryName: "オーディオ",
  statusName: "公開",
  imageUrl: null,
};

const PAGE: CursorPage<ProductListItem> = { items: [ITEM], nextCursor: null };

const ENTRY: ProductRankingEntry = {
  productId: "0195f0c2-0000-7000-8000-000000000002",
  name: "スマートウォッチ",
  price: "129.00",
  soldQuantity: 96,
};

const CATEGORIES: readonly ProductRef[] = [{ id: "c1", name: "オーディオ" }];

beforeEach(() => {
  getProductListPage.mockReset().mockResolvedValue(PAGE);
  getProductRanking.mockReset().mockResolvedValue([ENTRY]);
  getProductCategories.mockReset().mockResolvedValue(CATEGORIES);
});

describe("HomePageContent", () => {
  // ----- 正常系 -----
  it("3 系統を並べて描く", async () => {
    render(await HomePageContent());

    expect(screen.getByText("ワイヤレスイヤホン")).toBeVisible();
    expect(screen.getByText("スマートウォッチ")).toBeVisible();
    expect(screen.getByRole("link", { name: "オーディオ" })).toBeInTheDocument();
  });

  it("新着を公開日時の新しい順で取る", async () => {
    render(await HomePageContent());

    expect(getProductListPage).toHaveBeenCalledWith(
      expect.objectContaining({ sort: "-publishedAt" }),
    );
  });

  it("3 系統を直列にせず、いずれも取得を始めてから待つ", async () => {
    const started: string[] = [];
    const pending = <T,>(name: string, value: T) =>
      vi.fn(async () => {
        started.push(name);

        // 3 つとも「開始済み」になってから解決させる。直列なら 1 つ目の解決まで 2 つ目が始まらない。
        await Promise.resolve();

        return value;
      });

    getProductListPage.mockImplementation(pending("newArrivals", PAGE));
    getProductRanking.mockImplementation(pending("ranking", [ENTRY]));
    getProductCategories.mockImplementation(pending("categories", CATEGORIES));

    await HomePageContent();

    expect(started).toEqual(["newArrivals", "ranking", "categories"]);
  });

  // ----- 異常系 -----
  it("1 系統が落ちても残りを描く", async () => {
    getProductRanking.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    render(await HomePageContent());

    expect(screen.getByText("売上ランキングを表示できませんでした")).toBeVisible();
    expect(screen.getByText("ワイヤレスイヤホン")).toBeVisible();
  });

  it("落ちた系統の文言を分類から引く", async () => {
    getProductRanking.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    render(await HomePageContent());

    expect(
      screen.getByText("現在サービスを利用できません。しばらくしてから再試行してください。"),
    ).toBeVisible();
  });

  it("分類の無い失敗を internal の文言へ寄せる", async () => {
    getProductRanking.mockRejectedValue(new Error("生の失敗"));

    render(await HomePageContent());

    expect(screen.getByText("問題が発生しました。時間をおいて再試行してください。")).toBeVisible();
  });

  it("すべて落ちても画面ごと失敗にしない", async () => {
    const failure = createAppError(ErrorKind.UNAVAILABLE);

    getProductListPage.mockRejectedValue(failure);
    getProductRanking.mockRejectedValue(failure);
    getProductCategories.mockRejectedValue(failure);

    render(await HomePageContent());

    expect(screen.getAllByRole("alert")).toHaveLength(3);
  });
});
