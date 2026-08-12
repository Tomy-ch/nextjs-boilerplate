// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Product, ProductPage } from "@/model/product/product";

const { getProducts } = vi.hoisted(() => ({ getProducts: vi.fn() }));

vi.mock("@/adapters/server/api/products", () => ({ getProducts }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/adapters/server/media/media-url", () => ({
  resolveMediaUrl: (path: string | null) => (path === null ? null : `https://media.test/${path}`),
}));

import { ProductListPageContent } from "./page-content";

function productOf(overrides: Partial<Product> = {}): Product {
  return {
    id: "0195f0c2-0000-7000-8000-000000000001",
    name: "ワイヤレスイヤホン",
    description: null,
    price: "19.99",
    quantity: 12,
    stockWarningThreshold: null,
    status: { id: "s1", name: "公開" },
    category: { id: "c1", name: "オーディオ" },
    publishedAt: null,
    imagePaths: ["earphone.png"],
    ...overrides,
  };
}

function pageOf(items: readonly Product[], nextCursor: string | null = null): ProductPage {
  return { items, nextCursor };
}

describe("ProductListPageContent", () => {
  beforeEach(() => {
    getProducts.mockReset();
  });

  // ----- 正常系 -----
  it("取得した商品を一覧へ渡す", async () => {
    getProducts.mockResolvedValue(pageOf([productOf()]));

    render(await ProductListPageContent({ searchParams: {} }));

    expect(screen.getByText("ワイヤレスイヤホン")).toBeVisible();
  });

  it("URL の検索条件を取得条件へ直して渡す", async () => {
    getProducts.mockResolvedValue(pageOf([productOf()]));

    render(await ProductListPageContent({ searchParams: { keyword: "イヤホン", first: "20" } }));

    expect(getProducts).toHaveBeenCalledWith(
      expect.objectContaining({ keyword: "イヤホン", first: 20 }),
    );
  });

  it("検索欄に現在のキーワードを引き継ぐ", async () => {
    getProducts.mockResolvedValue(pageOf([productOf()]));

    render(await ProductListPageContent({ searchParams: { keyword: "イヤホン" } }));

    expect(screen.getByRole("searchbox")).toHaveValue("イヤホン");
  });

  it("画像パスを配信 URL へ解決して渡す", async () => {
    getProducts.mockResolvedValue(pageOf([productOf()]));

    render(await ProductListPageContent({ searchParams: {} }));

    expect(screen.getByRole("img", { name: "ワイヤレスイヤホン" })).toHaveAttribute(
      "src",
      expect.stringContaining(encodeURIComponent("https://media.test/earphone.png")),
    );
  });

  it("画像を持たない商品は代替画像で並べる", async () => {
    getProducts.mockResolvedValue(pageOf([productOf({ imagePaths: [] })]));

    render(await ProductListPageContent({ searchParams: {} }));

    expect(screen.getByRole("img", { name: "画像なし" })).toBeVisible();
  });

  it("次ページがあればページ送りを出す", async () => {
    getProducts.mockResolvedValue(pageOf([productOf()], "next-cursor"));

    render(await ProductListPageContent({ searchParams: {} }));

    expect(screen.getByRole("navigation", { name: "ページ送り" })).toBeVisible();
  });

  it("商品が無ければ一覧の案内を出す", async () => {
    getProducts.mockResolvedValue(pageOf([]));

    render(await ProductListPageContent({ searchParams: {} }));

    expect(screen.getByText("条件に合う商品がありません")).toBeVisible();
  });
});
