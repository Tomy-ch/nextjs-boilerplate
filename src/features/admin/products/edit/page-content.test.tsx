// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { idleActionState, succeededActionState } from "@/model/action-state";
import { toProductId } from "@/model/product/product";

const { getProduct, getProductCategories, getProductStatuses, resolveMediaUrl } = vi.hoisted(
  () => ({
    getProduct: vi.fn(),
    getProductCategories: vi.fn(),
    getProductStatuses: vi.fn(),
    resolveMediaUrl: vi.fn(),
  }),
);

vi.mock("@/adapters/server/api/products", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/products")>()),
  getProduct,
}));
vi.mock("@/adapters/server/api/product-masters", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/product-masters")>()),
  getProductCategories,
  getProductStatuses,
}));
vi.mock("@/adapters/server/media/media-url", () => ({ resolveMediaUrl }));

vi.mock("./view", () => ({
  AdminProductEditView: (props: { product: { name: string }; savedImages: unknown }) => (
    <output>{JSON.stringify({ name: props.product.name, images: props.savedImages })}</output>
  ),
}));

import { AdminProductEditPageContent } from "./page-content";

const PRODUCT = {
  id: toProductId("0195f0c2-0000-7000-8000-000000000001"),
  name: "ワイヤレスイヤホン",
  description: null,
  price: "19.99",
  quantity: 12,
  stockWarningThreshold: null,
  status: { id: "status-1", name: "在庫あり" },
  category: { id: "category-1", name: "電子機器" },
  publishedAt: null,
  imagePaths: ["products/saved.png"],
  version: 4,
};

beforeEach(() => {
  vi.clearAllMocks();
  getProduct.mockResolvedValue(PRODUCT);
  getProductCategories.mockResolvedValue([{ id: "category-1", name: "電子機器", code: 1 }]);
  getProductStatuses.mockResolvedValue([{ id: "status-1", name: "在庫あり", code: 1 }]);
  resolveMediaUrl.mockReturnValue("https://media.example.test/products/saved.png");
});

function renderContent() {
  return AdminProductEditPageContent({
    id: PRODUCT.id,
    maxUploadBytes: 4 * 1024 * 1024,
    updateAction: () => Promise.resolve(idleActionState()),
    uploadAction: () => Promise.resolve(succeededActionState("products/a.png")),
  });
}

describe("AdminProductEditPageContent", () => {
  it("編集する商品を揃えて画面へ渡す", async () => {
    render(await renderContent());

    expect(screen.getByRole("status").textContent).toContain("ワイヤレスイヤホン");
  });

  it("保存済みの画像を、表示 URL まで解決して渡す", async () => {
    render(await renderContent());

    expect(screen.getByRole("status").textContent).toContain(
      "https://media.example.test/products/saved.png",
    );
  });

  it("互いに依存しない取得を並行して行う", async () => {
    await renderContent();

    expect(getProduct).toHaveBeenCalledTimes(1);
    expect(getProductCategories).toHaveBeenCalledTimes(1);
    expect(getProductStatuses).toHaveBeenCalledTimes(1);
  });

  it("配信元が解決できない画像は渡さない", async () => {
    resolveMediaUrl.mockReturnValue(null);

    render(await renderContent());

    expect(screen.getByRole("status").textContent).toContain('"images":[]');
  });

  it("存在しない商品の取得の失敗は握り潰さず、境界へ渡す", async () => {
    getProduct.mockRejectedValue(new Error("見つかりません"));

    await expect(renderContent()).rejects.toThrow("見つかりません");
  });
});
