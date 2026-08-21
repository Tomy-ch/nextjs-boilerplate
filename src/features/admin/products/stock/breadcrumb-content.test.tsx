// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toProductId } from "@/model/product/product";

const { getProduct } = vi.hoisted(() => ({ getProduct: vi.fn() }));

vi.mock("@/adapters/server/api/products", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/products")>()),
  getProduct,
}));

import { AdminProductStockBreadcrumbContent } from "./breadcrumb-content";

const ID = toProductId("0195f0c2-0000-7000-8000-000000000001");

describe("AdminProductStockBreadcrumbContent", () => {
  beforeEach(() => {
    getProduct.mockReset();
  });

  it("一覧・商品名・在庫補充の順に階層を出す", async () => {
    getProduct.mockResolvedValue({ name: "ワイヤレスイヤホン" });

    render(await AdminProductStockBreadcrumbContent({ id: ID }));

    expect(screen.getByRole("link", { name: "商品一覧管理" })).toBeInTheDocument();
    expect(screen.getByText("ワイヤレスイヤホン")).toBeInTheDocument();
    expect(screen.getByText("在庫補充")).toBeInTheDocument();
  });

  it("途中の商品名は戻り先を持たない", async () => {
    getProduct.mockResolvedValue({ name: "ワイヤレスイヤホン" });

    render(await AdminProductStockBreadcrumbContent({ id: ID }));

    expect(screen.queryByRole("link", { name: "ワイヤレスイヤホン" })).not.toBeInTheDocument();
  });
});
