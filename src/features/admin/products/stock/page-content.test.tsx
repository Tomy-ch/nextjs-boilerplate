// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { idleActionState } from "@/model/action-state";
import { toProductId } from "@/model/product/product";

const { getProduct } = vi.hoisted(() => ({ getProduct: vi.fn() }));

vi.mock("@/adapters/server/api/products", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/products")>()),
  getProduct,
}));

vi.mock("./view", () => ({
  AdminProductStockView: (props: { product: { name: string; quantity: number } }) => (
    <output>{`${props.product.name}:${props.product.quantity}`}</output>
  ),
}));

import { AdminProductStockPageContent } from "./page-content";

const ID = toProductId("0195f0c2-0000-7000-8000-000000000001");

const PRODUCT = {
  id: ID,
  name: "ワイヤレスイヤホン",
  description: null,
  price: "19.99",
  quantity: 128,
  stockWarningThreshold: null,
  status: { id: "status-1", name: "在庫あり" },
  category: { id: "category-1", name: "電子機器" },
  publishedAt: null,
  discontinuedAt: null,
  imagePaths: [],
  version: 4,
};

const adjustAction = () => Promise.resolve(idleActionState<void>());

describe("AdminProductStockPageContent", () => {
  beforeEach(() => {
    getProduct.mockReset();
  });

  it("対象の商品を取得して画面へ渡す", async () => {
    getProduct.mockResolvedValue(PRODUCT);

    render(await AdminProductStockPageContent({ adjustAction, id: ID }));

    expect(getProduct).toHaveBeenCalledWith(ID);
    expect(screen.getByText("ワイヤレスイヤホン:128")).toBeInTheDocument();
  });

  it("取得が失敗すれば、その失敗を境界へ渡す", async () => {
    getProduct.mockRejectedValue(new Error("対象が見つかりません"));

    await expect(AdminProductStockPageContent({ adjustAction, id: ID })).rejects.toThrow(
      "対象が見つかりません",
    );
  });
});
