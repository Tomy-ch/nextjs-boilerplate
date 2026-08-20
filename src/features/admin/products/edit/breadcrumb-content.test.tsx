// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toProductId } from "@/model/product/product";

const { getProduct } = vi.hoisted(() => ({ getProduct: vi.fn() }));

vi.mock("@/adapters/server/api/products", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/products")>()),
  getProduct,
}));

import { AdminProductEditBreadcrumbContent } from "./breadcrumb-content";

const ID = toProductId("0195f0c2-0000-7000-8000-000000000001");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminProductEditBreadcrumbContent", () => {
  // ----- 正常系 -----
  it("一覧の下に、商品名と編集に居ることを出す", async () => {
    getProduct.mockResolvedValue({ id: ID, name: "ワイヤレスイヤホン" });

    render(await AdminProductEditBreadcrumbContent({ id: ID }));

    expect(screen.getByRole("link", { name: "商品一覧管理" })).toBeInTheDocument();
    expect(screen.getByText("ワイヤレスイヤホン")).toBeInTheDocument();
    expect(screen.getByText("編集")).toBeInTheDocument();
  });

  it("本文と同じ取得を通す。同じ描画では 1 回にまとまる", async () => {
    getProduct.mockResolvedValue({ id: ID, name: "ワイヤレスイヤホン" });

    render(await AdminProductEditBreadcrumbContent({ id: ID }));

    expect(getProduct).toHaveBeenCalledWith(ID);
  });
});
