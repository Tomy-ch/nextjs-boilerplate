// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { CursorPage } from "@/model/pagination";
import type { ProductListItem } from "@/model/product/product";

const { getProductListPage, getProductCount } = vi.hoisted(() => ({
  getProductListPage: vi.fn(),
  getProductCount: vi.fn(),
}));

vi.mock("@/adapters/server/api/products", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/products")>()),
  getProductListPage,
  getProductCount,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { ProductListResults } from "./results";

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

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

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
  getProductListPage.mockReset().mockResolvedValue(pageOf([itemOf()]));
  getProductCount.mockReset().mockResolvedValue(10);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ProductListResults", () => {
  it("取得した商品を並べる", async () => {
    render(await ProductListResults({ query: {}, selection: {} }));

    expect(screen.getByRole("link", { name: "ワイヤレスイヤホン" })).toBeVisible();
  });

  it("一致する総数と読み込み済みの件数を添える", async () => {
    render(await ProductListResults({ query: {}, selection: {} }));

    expect(screen.getByText("全 10 件中 1 件を表示中")).toBeVisible();
  });

  it("一覧と件数へ同じ取得条件を渡す", async () => {
    const query = { keyword: "イヤホン", first: 24 };

    render(await ProductListResults({ query, selection: {} }));

    expect(getProductListPage).toHaveBeenCalledWith(query);
    expect(getProductCount).toHaveBeenCalledWith(query);
  });

  it("一覧と件数を並行して取得する", async () => {
    render(await ProductListResults({ query: {}, selection: {} }));

    expect(getProductListPage).toHaveBeenCalledTimes(1);
    expect(getProductCount).toHaveBeenCalledTimes(1);
  });

  it("件数が取れなくても一覧は出し、総数だけを落とす", async () => {
    getProductCount.mockRejectedValue(new Error("count unavailable"));

    render(await ProductListResults({ query: {}, selection: {} }));

    expect(screen.getByRole("link", { name: "ワイヤレスイヤホン" })).toBeVisible();
    expect(screen.getByText("1 件を表示中")).toBeVisible();
  });

  it("一覧そのものが取れなければ失敗を通す", async () => {
    getProductListPage.mockRejectedValue(new Error("list unavailable"));

    await expect(ProductListResults({ query: {}, selection: {} })).rejects.toThrow(
      "list unavailable",
    );
  });

  it("読み進めた位置を落とした条件を続きの取得へ渡す", async () => {
    render(
      await ProductListResults({
        query: {},
        selection: { keyword: "イヤホン", after: "cursor-1", first: "48" },
      }),
    );

    expect(screen.getByRole("link", { name: "ワイヤレスイヤホン" })).toBeVisible();
  });

  it("条件に合う商品が無ければ次にすべきことを示す", async () => {
    getProductListPage.mockResolvedValue(pageOf([]));
    getProductCount.mockResolvedValue(0);

    render(await ProductListResults({ query: {}, selection: {} }));

    expect(screen.getByText("条件に合う商品がありません")).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(await ProductListResults({ query: {}, selection: {} }));

    expect((await axe(container)).violations).toEqual([]);
  });
});
