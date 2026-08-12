// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { Product } from "@/model/product/product";
import { useCartStore } from "@/stores/cart-store";
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
    id: "0195f0c2-0000-7000-8000-000000000001",
    name: "深煎りブレンド",
    description: "<p>香りの説明</p>",
    price: "12.34",
    quantity: 7,
    stockWarningThreshold: null,
    status: { id: "s1", name: "公開中" },
    category: { id: "c1", name: "コーヒー" },
    publishedAt: null,
    imagePaths: ["coffee-front.png"],
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

  // ----- 正常系 -----
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

  it("渡された URL で画像を出す", () => {
    render(<ProductDetail imageUrls={IMAGE_URLS} product={productOf()} />);

    expect(screen.getByRole("img", { name: "深煎りブレンド" })).toHaveAttribute(
      "src",
      expect.stringContaining(encodeURIComponent(IMAGE_URL)),
    );
  });

  it("画像を carousel に載せる", () => {
    render(<ProductDetail imageUrls={IMAGE_URLS} product={productOf()} />);

    expect(screen.getByRole("region", { name: "深煎りブレンドの画像" })).toBeVisible();
  });

  it("画像の枚数だけ送り先の一覧を下に並べる", () => {
    render(<ProductDetail imageUrls={THREE_IMAGE_URLS} product={productOf()} />);

    expect(screen.getAllByRole("group")).toHaveLength(3);
    expect(screen.getByRole("list", { name: "画像の一覧" })).toBeVisible();
    expect(screen.getByRole("link", { name: "2 枚目" })).toHaveAttribute(
      "href",
      "#product-image-2",
    );
  });

  it("画像が 1 枚でも送り先の一覧を出す", () => {
    render(<ProductDetail imageUrls={IMAGE_URLS} product={productOf()} />);

    expect(screen.getByRole("link", { name: "1 枚目" })).toHaveAttribute(
      "href",
      "#product-image-1",
    );
  });

  it("同じ URL の画像が並んでも枚数どおりに並べる", () => {
    render(<ProductDetail imageUrls={[IMAGE_URL, IMAGE_URL]} product={productOf()} />);

    expect(screen.getAllByRole("group")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "2 枚目" })).toBeVisible();
  });

  it("先頭では前へを出さず、末尾では次へを出さない", () => {
    render(<ProductDetail imageUrls={THREE_IMAGE_URLS} product={productOf()} />);
    const [first, middle, last] = screen.getAllByRole("group");

    expect(within(first).queryByRole("link", { name: "前へ" })).not.toBeInTheDocument();
    expect(within(first).getByRole("link", { name: "次へ" })).toBeVisible();
    expect(within(middle).getByRole("link", { name: "前へ" })).toBeVisible();
    expect(within(middle).getByRole("link", { name: "次へ" })).toBeVisible();
    expect(within(last).getByRole("link", { name: "前へ" })).toBeVisible();
    expect(within(last).queryByRole("link", { name: "次へ" })).not.toBeInTheDocument();
  });

  it("カートへ渡す明細に先頭の画像を載せる", async () => {
    useCartStore.setState({ lines: [] });
    render(<ProductDetail imageUrls={THREE_IMAGE_URLS} product={productOf()} />);

    await userEvent.click(screen.getByRole("button", { name: "カートに追加" }));

    expect(useCartStore.getState().lines[0]?.imageUrl).toBe(IMAGE_URL);
  });

  it("画像を持たない商品ではカートへ渡す明細の画像を空にする", async () => {
    useCartStore.setState({ lines: [] });
    render(<ProductDetail imageUrls={[]} product={productOf({ imagePaths: [] })} />);

    await userEvent.click(screen.getByRole("button", { name: "カートに追加" }));

    expect(useCartStore.getState().lines[0]?.imageUrl).toBeNull();
  });

  it("一覧へ戻る導線を出す", () => {
    render(<ProductDetail imageUrls={IMAGE_URLS} product={productOf()} />);

    expect(screen.getByRole("link", { name: "商品一覧へ戻る" })).toHaveAttribute(
      "href",
      "/products",
    );
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

  it("画像を持たない商品では代替画像を出す", () => {
    render(<ProductDetail imageUrls={[]} product={productOf({ imagePaths: [] })} />);

    expect(screen.getByRole("img", { name: "画像なし" })).toHaveAttribute("src", "/no-image.svg");
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
