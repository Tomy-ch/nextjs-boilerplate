// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { ActionState } from "@/model/action-state";
import type { Product } from "@/model/product/product";
import { toProductId } from "@/model/product/product";

const { addToCartAction } = vi.hoisted(() => ({
  addToCartAction:
    vi.fn<(previous: ActionState<void>, formData: FormData) => Promise<ActionState<void>>>(),
}));

vi.mock("@/features/cart/facade/add-to-cart/add-to-cart", () => ({ addToCartAction }));

import { ProductDetail } from "./view";

const IMAGE_URL = "https://media.example.test/coffee-front.png";
const IMAGE_URLS = [IMAGE_URL] as const;
const THREE_IMAGE_URLS = [
  IMAGE_URL,
  "https://media.example.test/coffee-back.png",
  "https://media.example.test/coffee-side.png",
] as const;

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

function productOf(overrides: Partial<Product> = {}): Product {
  return {
    id: toProductId("0195f0c2-0000-7000-8000-000000000001"),
    name: "深煎りブレンド",
    description: "<p>香りの説明</p>",
    price: "12.34",
    quantity: 7,
    stockWarningThreshold: null,
    status: { id: "s1", name: "公開中" },
    category: { id: "c1", name: "コーヒー" },
    publishedAt: null,
    discontinuedAt: null,
    imagePaths: ["coffee-front.png"],
    version: 1,
    ...overrides,
  };
}

describe("ProductDetail", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("商品名を見出しに出す", () => {
    render(<ProductDetail imageUrls={IMAGE_URLS} product={productOf()} />);

    expect(screen.getByRole("heading", { level: 1, name: "深煎りブレンド" })).toBeVisible();
  });

  it("価格・在庫・分類・状態を出す", () => {
    render(<ProductDetail imageUrls={IMAGE_URLS} product={productOf()} />);

    expect(screen.getByText("$12.34")).toBeVisible();
    expect(screen.getByText("7 個")).toBeVisible();
    expect(screen.getByText("コーヒー")).toBeVisible();
    expect(screen.getByText("公開中")).toBeVisible();
  });

  it("公開日時を locale に沿った表記で出す", () => {
    render(
      <ProductDetail
        imageUrls={IMAGE_URLS}
        product={productOf({ publishedAt: new Date("2026-08-12T00:05:00.000Z") })}
      />,
    );

    expect(screen.getByText("2026/08/12 9:05")).toBeVisible();
  });

  it("画像の面へ商品名と URL を渡す", () => {
    render(<ProductDetail imageUrls={IMAGE_URLS} product={productOf()} />);

    expect(screen.getByRole("region", { name: "深煎りブレンドの画像" })).toBeVisible();
    expect(screen.getByRole("img", { name: "深煎りブレンド" })).toHaveAttribute(
      "src",
      expect.stringContaining(encodeURIComponent(IMAGE_URL)),
    );
  });

  it("カートへは商品を指す値だけを渡す", async () => {
    addToCartAction.mockResolvedValue({ status: "success", value: undefined });
    render(<ProductDetail imageUrls={THREE_IMAGE_URLS} product={productOf()} />);

    await userEvent.click(screen.getByRole("button", { name: "カートに追加" }));

    const formData = addToCartAction.mock.calls.at(-1)?.[1];

    expect([...(formData?.keys() ?? [])]).toEqual(["productId"]);
    expect(formData?.get("productId")).toBe(productOf().id);
  });

  it("在庫が無い商品ではカートへ入れられない", () => {
    render(<ProductDetail imageUrls={[]} product={productOf({ quantity: 0, imagePaths: [] })} />);

    expect(screen.getByRole("button", { name: "カートに追加" })).toBeDisabled();
  });

  it("サイト構造上の階層を示す", () => {
    render(<ProductDetail imageUrls={IMAGE_URLS} product={productOf()} />);

    const breadcrumb = within(screen.getByRole("navigation", { name: "パンくずリスト" }));

    expect(breadcrumb.getByRole("link", { name: "トップ" })).toHaveAttribute("href", "/");
    expect(breadcrumb.getByRole("link", { name: "商品一覧" })).toHaveAttribute("href", "/products");
    expect(breadcrumb.getByText("深煎りブレンド")).toBeVisible();
  });

  it("カートに追加する操作を出す", () => {
    render(<ProductDetail imageUrls={IMAGE_URLS} product={productOf()} />);

    expect(screen.getByRole("button", { name: "カートに追加" })).toBeEnabled();
  });

  it("在庫が境界以下なら残りわずかであることを示す", () => {
    render(
      <ProductDetail
        imageUrls={IMAGE_URLS}
        product={productOf({ quantity: 2, stockWarningThreshold: 2 })}
      />,
    );

    expect(screen.getByText("残りわずか")).toBeVisible();
  });

  it("境界が設定されていなければ残りわずかとは示さない", () => {
    render(
      <ProductDetail
        imageUrls={[]}
        product={productOf({ quantity: 5, stockWarningThreshold: null })}
      />,
    );

    expect(screen.queryByText("残りわずか")).not.toBeInTheDocument();
  });

  it("在庫が境界を上回れば残りわずかとは示さない", () => {
    render(
      <ProductDetail
        imageUrls={IMAGE_URLS}
        product={productOf({ quantity: 3, stockWarningThreshold: 2 })}
      />,
    );

    expect(screen.queryByText("残りわずか")).not.toBeInTheDocument();
  });

  it("description を sanitizer 経由で描画する", () => {
    render(<ProductDetail imageUrls={IMAGE_URLS} product={productOf()} />);

    expect(screen.getByText("香りの説明")).toBeVisible();
  });

  it("アクセシビリティ違反を持たない", async () => {
    const { container } = render(
      <ProductDetail imageUrls={THREE_IMAGE_URLS} product={productOf()} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });

  it("script を含む description を無害化して描画する", () => {
    render(
      <ProductDetail
        imageUrls={IMAGE_URLS}
        product={productOf({
          description:
            '<p>本文</p><script>window.__xss = 1;</script><img src=x onerror="alert(1)">',
        })}
      />,
    );

    expect(screen.getByText("本文")).toBeVisible();
    expect(document.querySelector("script")).toBeNull();
    expect(screen.queryByRole("img", { name: "" })).not.toBeInTheDocument();
  });

  it("在庫が無ければカートに追加できない", () => {
    render(<ProductDetail imageUrls={IMAGE_URLS} product={productOf({ quantity: 0 })} />);

    expect(screen.getByRole("button", { name: "カートに追加" })).toBeDisabled();
    expect(screen.getByText("在庫なし")).toBeVisible();
  });

  it("公開日時を持たない商品では未公開として示す", () => {
    render(<ProductDetail imageUrls={IMAGE_URLS} product={productOf()} />);

    expect(screen.getByText("未公開")).toBeInTheDocument();
  });

  it("description を持たない商品では本文を出さない", () => {
    render(<ProductDetail imageUrls={IMAGE_URLS} product={productOf({ description: null })} />);

    expect(screen.queryByRole("heading", { name: "商品説明" })).not.toBeInTheDocument();
  });
});
