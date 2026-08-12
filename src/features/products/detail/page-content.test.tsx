// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

const { getProduct } = vi.hoisted(() => ({ getProduct: vi.fn() }));
const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/adapters/server/api/products", () => ({ getProduct }));
vi.mock("@/adapters/server/media/media-url", () => ({
  resolveMediaUrl: (path: string | null) => (path === null ? null : `https://media.test/${path}`),
}));
vi.mock("next/navigation", () => ({ notFound }));

import { ProductDetailPageContent } from "./product-detail-page-content";

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

const PRODUCT = {
  id: "0195f0c2-0000-7000-8000-000000000001",
  name: "深煎りブレンド",
  description: null,
  price: "12.34",
  quantity: 7,
  stockWarningThreshold: null,
  status: { id: "s1", name: "公開中" },
  category: { id: "c1", name: "コーヒー" },
  publishedAt: null,
  imagePaths: ["coffee.png"],
};

describe("ProductDetailPageContent", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
    getProduct.mockReset();
    notFound.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ----- 正常系 -----
  it("取得した商品を詳細表示へ渡す", async () => {
    getProduct.mockResolvedValue(PRODUCT);

    render(await ProductDetailPageContent({ id: PRODUCT.id }));

    expect(screen.getByRole("heading", { level: 1, name: "深煎りブレンド" })).toBeVisible();
  });

  it("画像パスを配信 URL へ解決して渡す", async () => {
    getProduct.mockResolvedValue(PRODUCT);

    render(await ProductDetailPageContent({ id: PRODUCT.id }));

    expect(screen.getByRole("img", { name: "深煎りブレンド" })).toHaveAttribute(
      "src",
      expect.stringContaining(encodeURIComponent("https://media.test/coffee.png")),
    );
  });

  it("見つからない商品は Next の not-found 境界へ渡す", async () => {
    getProduct.mockRejectedValue(new AppError(ErrorKind.NOT_FOUND));

    await expect(ProductDetailPageContent({ id: "missing" })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("not-found 以外の分類はそのまま投げ直す", async () => {
    getProduct.mockRejectedValue(new AppError(ErrorKind.INTERNAL));

    await expect(ProductDetailPageContent({ id: PRODUCT.id })).rejects.toBeInstanceOf(AppError);
    expect(notFound).not.toHaveBeenCalled();
  });
});
