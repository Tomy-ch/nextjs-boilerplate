// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CursorPage } from "@/model/pagination";
import type { ProductListItem, ProductRef } from "@/model/product/product";

const { getProductListPage, getProductTotalCount } = vi.hoisted(() => ({
  getProductListPage: vi.fn(),
  getProductTotalCount: vi.fn(),
}));
const { getProductCategories } = vi.hoisted(() => ({
  getProductCategories: vi.fn(),
}));

vi.mock("@/adapters/server/api/products", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/products")>()),
  getProductListPage,
  getProductTotalCount,
}));
vi.mock("@/adapters/server/api/product-masters", () => ({
  getProductCategories,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { ProductListPageContent } from "./page-content";

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

const CATEGORIES: readonly ProductRef[] = [{ id: "c1", name: "オーディオ" }];

function itemOf(overrides: Partial<ProductListItem> = {}): ProductListItem {
  return {
    id: "0195f0c2-0000-7000-8000-000000000001",
    name: "ワイヤレスイヤホン",
    price: "19.99",
    quantity: 12,
    categoryName: "オーディオ",
    statusName: "公開",
    imageUrl: null,
    ...overrides,
  };
}

function pageOf(
  items: readonly ProductListItem[],
  nextCursor: string | null = null,
): CursorPage<ProductListItem> {
  return { items, nextCursor };
}

describe("ProductListPageContent", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
    getProductListPage.mockReset().mockResolvedValue(pageOf([itemOf()]));
    getProductTotalCount.mockReset().mockResolvedValue(10);
    getProductCategories.mockReset().mockResolvedValue(CATEGORIES);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ----- 正常系 -----
  it("取得した商品を一覧へ渡す", async () => {
    render(await ProductListPageContent({ searchParams: {} }));

    expect(screen.getByRole("link", { name: "ワイヤレスイヤホン" })).toBeVisible();
  });

  it("総数と読み込み済みの件数を添える", async () => {
    render(await ProductListPageContent({ searchParams: {} }));

    expect(screen.getByText("全 10 件中 1 件を表示中")).toBeVisible();
  });

  it("URL の条件を契約に照らして取得条件へ渡す", async () => {
    render(await ProductListPageContent({ searchParams: { keyword: "イヤホン", first: "20" } }));

    expect(getProductListPage).toHaveBeenCalledWith(
      expect.objectContaining({ keyword: "イヤホン", first: 20 }),
    );
  });

  it("件数の指定が無ければ 1 度に読み込む件数を補う", async () => {
    render(await ProductListPageContent({ searchParams: {} }));

    expect(getProductListPage).toHaveBeenCalledWith(expect.objectContaining({ first: 24 }));
  });

  it("マスタを「すべて」付きの絞り込みへ並べる", async () => {
    render(await ProductListPageContent({ searchParams: {} }));

    expect(screen.getByRole("group", { name: "カテゴリ" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "オーディオ" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio", { checked: true, name: "すべて" })).toHaveLength(1);
  });

  it("検索欄に現在のキーワードを引き継ぐ", async () => {
    render(await ProductListPageContent({ searchParams: { keyword: "イヤホン" } }));

    expect(screen.getByRole("searchbox", { name: "商品名で探す" })).toHaveValue("イヤホン");
  });

  it("明示された並び順を選択済みにする", async () => {
    render(await ProductListPageContent({ searchParams: { sort: "publishedAt" } }));

    expect(screen.getByRole("option", { name: "古い順", selected: true })).toBeInTheDocument();
  });

  it("既定の並び順は選択肢の「指定なし」へ寄せる", async () => {
    render(await ProductListPageContent({ searchParams: { sort: "-publishedAt" } }));

    expect(screen.getByRole("option", { name: "新着順", selected: true })).toBeInTheDocument();
  });

  it("条件に合う商品が無ければ次にすべきことを示す", async () => {
    getProductListPage.mockResolvedValue(pageOf([]));

    render(await ProductListPageContent({ searchParams: {} }));

    expect(screen.getByText("条件に合う商品がありません")).toBeVisible();
  });

  // ----- 異常系 -----
  it("契約を外れた条件では一覧の代わりに案内を出す", async () => {
    render(await ProductListPageContent({ searchParams: { sort: "-price" } }));

    expect(screen.getByText("この条件では商品を表示できません")).toBeVisible();
    expect(screen.getByText("確認する条件: 並び替え")).toBeVisible();
  });

  it("契約を外れた条件では取得しない", async () => {
    render(await ProductListPageContent({ searchParams: { categoryId: "not-a-uuid" } }));

    expect(getProductListPage).not.toHaveBeenCalled();
    expect(screen.queryByRole("searchbox", { name: "キーワード" })).not.toBeInTheDocument();
  });
});
