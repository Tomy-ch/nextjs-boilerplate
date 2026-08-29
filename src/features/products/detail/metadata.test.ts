import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

const { getProduct } = vi.hoisted(() => ({ getProduct: vi.fn() }));

vi.mock("@/adapters/server/api/products", () => ({ getProduct }));

import { resolveProductMetadata } from "./metadata";

/** 段落 1 つの説明。 */
function paragraph(text: string): string {
  return "<p>".concat(text, "</p>");
}

const PRODUCT = {
  id: "0195f0c2-0000-7000-8000-000000000001",
  name: "深煎りブレンド",
  description: "<p>深く<strong>香ばしい</strong>一杯。</p>",
  price: "12.34",
  quantity: 7,
  stockWarningThreshold: null,
  status: { id: "s1", name: "公開中" },
  category: { id: "c1", name: "コーヒー" },
  publishedAt: null,
  imagePaths: [],
  version: 1,
};

describe("resolveProductMetadata", () => {
  beforeEach(() => {
    getProduct.mockReset();
  });

  // ----- 正常系 -----
  it("商品名を題にし、開かれた経路を正規 URL として名乗る", async () => {
    getProduct.mockResolvedValue({ ...PRODUCT, id: "0195f0c2-0000-7000-8000-000000000002" });

    const metadata = await resolveProductMetadata(PRODUCT.id);

    expect(metadata.title).toBe("深煎りブレンド");
    expect(metadata.alternates).toEqual({ canonical: `/products/${PRODUCT.id}` });
    expect(metadata.robots).toBeUndefined();
  });

  it("説明は markup を落とした平文にする", async () => {
    getProduct.mockResolvedValue(PRODUCT);

    expect((await resolveProductMetadata(PRODUCT.id)).description).toBe("深く香ばしい一杯。");
  });

  it("説明の中の連続する空白は 1 つに畳む", async () => {
    getProduct.mockResolvedValue({ ...PRODUCT, description: "<p>深く\n\n  香ばしい</p>" });

    expect((await resolveProductMetadata(PRODUCT.id)).description).toBe("深く 香ばしい");
  });

  it("説明が 160 文字までなら全文を採る", async () => {
    getProduct.mockResolvedValue({ ...PRODUCT, description: paragraph("あ".repeat(160)) });

    expect((await resolveProductMetadata(PRODUCT.id)).description).toBe("あ".repeat(160));
  });

  it("説明が 160 文字を超えれば先頭 160 文字だけを採る", async () => {
    getProduct.mockResolvedValue({ ...PRODUCT, description: paragraph("あ".repeat(161)) });

    expect((await resolveProductMetadata(PRODUCT.id)).description).toBe("あ".repeat(160));
  });

  it("切り詰めは文字単位で、サロゲートペアを壊さない", async () => {
    getProduct.mockResolvedValue({ ...PRODUCT, description: paragraph("😀".repeat(161)) });

    expect((await resolveProductMetadata(PRODUCT.id)).description).toBe("😀".repeat(160));
  });

  it("説明が無ければ description を置かない", async () => {
    getProduct.mockResolvedValue({ ...PRODUCT, description: null });

    expect((await resolveProductMetadata(PRODUCT.id)).description).toBeUndefined();
  });

  it("説明が markup だけで平文を持たなければ description を置かない", async () => {
    getProduct.mockResolvedValue({ ...PRODUCT, description: "<p> </p><hr>" });

    expect((await resolveProductMetadata(PRODUCT.id)).description).toBeUndefined();
  });

  // ----- 異常系 -----
  it("見つからない商品は noindex を名乗り、正規 URL を持たない", async () => {
    getProduct.mockRejectedValue(new AppError(ErrorKind.NOT_FOUND));

    const metadata = await resolveProductMetadata(PRODUCT.id);

    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates).toBeUndefined();
  });

  it("見つからない以外の失敗はそのまま投げる", async () => {
    getProduct.mockRejectedValue(new AppError(ErrorKind.UNAVAILABLE));

    await expect(resolveProductMetadata(PRODUCT.id)).rejects.toThrow(ErrorKind.UNAVAILABLE);
  });
});
