// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { Product, ProductStatus } from "@/model/product/product";
import { toProductId } from "@/model/product/product";

const { getProducts, getProductStatuses } = vi.hoisted(() => ({
  getProducts: vi.fn(),
  getProductStatuses: vi.fn(),
}));

vi.mock("@/adapters/server/api/products", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/products")>()),
  getProducts,
}));
vi.mock("@/adapters/server/api/product-masters", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/product-masters")>()),
  getProductStatuses,
}));

import type { ProductQuery } from "@/adapters/server/api/products";

import type { AdminProductListLocation } from "./query";
import { AdminProductListResults } from "./results";

const STATUS_ID = "6b0f2f3e-0000-4000-8000-000000000001";

const STATUSES: readonly ProductStatus[] = [{ id: STATUS_ID, name: "在庫あり", code: 1 }];

function product(): Product {
  return {
    id: toProductId("0195f0c2-0000-7000-8000-000000000001"),
    name: "ワイヤレスイヤホン",
    description: null,
    price: "19.99",
    quantity: 12,
    stockWarningThreshold: null,
    status: { id: STATUS_ID, name: "在庫あり" },
    category: { id: "c1", name: "電子機器" },
    publishedAt: null,
    imagePaths: [],
  };
}

const QUERY: ProductQuery = { first: 20 };

function location(overrides: Partial<AdminProductListLocation> = {}): AdminProductListLocation {
  return { keyword: "", categoryCodes: [], statusCodes: [], cursor: null, trail: [], ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  getProducts.mockResolvedValue({ items: [product()], nextCursor: null });
  getProductStatuses.mockResolvedValue(STATUSES);
});

describe("AdminProductListResults", () => {
  it("取得した商品を表に並べる", async () => {
    render(await AdminProductListResults({ location: location(), query: QUERY }));

    expect(screen.getByRole("link", { name: "ワイヤレスイヤホン" })).toBeInTheDocument();
  });

  it("受け取った取得条件をそのまま取得へ渡す", async () => {
    const query: ProductQuery = { keyword: "鞄", categoryCodes: [1], first: 20 };

    render(await AdminProductListResults({ location: location(), query }));

    expect(getProducts).toHaveBeenCalledWith(query);
  });

  it("取得条件を URL から組み立て直さない", async () => {
    render(
      await AdminProductListResults({
        location: location({ keyword: "使われない", categoryCodes: ["9"] }),
        query: QUERY,
      }),
    );

    expect(getProducts).toHaveBeenCalledWith(QUERY);
  });

  it("次の起点があれば次へ進める", async () => {
    getProducts.mockResolvedValue({ items: [product()], nextCursor: "c2" });

    render(await AdminProductListResults({ location: location({ cursor: "c1" }), query: QUERY }));

    expect(screen.getByRole("link", { name: "次へ" })).toHaveAttribute(
      "href",
      "/admin/products?after=c2&trail=c1",
    );
  });

  it("次の起点が無ければ次へは押せない", async () => {
    render(await AdminProductListResults({ location: location(), query: QUERY }));

    expect(screen.queryByRole("link", { name: "次へ" })).not.toBeInTheDocument();
  });

  it("先頭ページでは前へが押せない", async () => {
    render(await AdminProductListResults({ location: location(), query: QUERY }));

    expect(screen.queryByRole("link", { name: "前へ" })).not.toBeInTheDocument();
  });

  it("途中のページでは前へ戻れる", async () => {
    render(
      await AdminProductListResults({
        location: location({ cursor: "c2", trail: ["c1"] }),
        query: QUERY,
      }),
    );

    expect(screen.getByRole("link", { name: "前へ" })).toHaveAttribute(
      "href",
      "/admin/products?after=c1",
    );
  });

  it("状態のマスタと突き合わせて見た目を決める", async () => {
    render(await AdminProductListResults({ location: location(), query: QUERY }));

    expect(screen.getByText("在庫あり")).toHaveAttribute("data-variant", "secondary");
  });

  it("該当が無ければ表の空の姿を出す", async () => {
    getProducts.mockResolvedValue({ items: [], nextCursor: null });

    render(await AdminProductListResults({ location: location(), query: QUERY }));

    expect(screen.getByText("条件に一致する商品はありません。")).toBeInTheDocument();
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(
      await AdminProductListResults({ location: location(), query: QUERY }),
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
