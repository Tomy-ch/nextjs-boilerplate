// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Product } from "@/model/product/product";
import { ProductList } from "./product-list";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "0f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b11",
    name: "ワイヤレスイヤホン",
    description: null,
    price: "19.99",
    quantity: 12,
    status: { id: "s1", name: "公開" },
    category: { id: "c1", name: "オーディオ" },
    publishedAt: null,
    imagePath: null,
    ...overrides,
  };
}

describe("ProductList", () => {
  // ----- 正常系 -----
  it("渡された商品を並べる", () => {
    render(
      <ProductList
        items={[
          { product: product(), imageUrl: null },
          { product: product({ id: "b", name: "スマートウォッチ" }), imageUrl: null },
        ]}
      />,
    );

    expect(screen.getAllByTestId("product-card")).toHaveLength(2);
  });

  it("商品名と価格を示す", () => {
    render(<ProductList items={[{ product: product(), imageUrl: null }]} />);

    expect(screen.getByText("ワイヤレスイヤホン")).toBeInTheDocument();
    expect(screen.getByText("$19.99")).toBeInTheDocument();
  });

  it("カテゴリを示す", () => {
    render(<ProductList items={[{ product: product(), imageUrl: null }]} />);

    expect(screen.getByText("オーディオ")).toBeInTheDocument();
  });

  it("画像 URL があれば画像を出す", () => {
    render(
      <ProductList
        items={[{ product: product(), imageUrl: "https://media.example.test/products/a.png" }]}
      />,
    );

    expect(screen.getByAltText("ワイヤレスイヤホン")).toBeInTheDocument();
  });

  it("在庫が無い商品にその旨を示す", () => {
    render(<ProductList items={[{ product: product({ quantity: 0 }), imageUrl: null }]} />);

    expect(screen.getByText("在庫なし")).toBeInTheDocument();
  });
  // ----- 異常系 -----
  it("商品が無いとき次にすべきことを示す", () => {
    render(<ProductList items={[]} />);

    expect(screen.getByText("条件に合う商品がありません")).toBeInTheDocument();
    expect(screen.getByText(/絞り込みを外して/)).toBeInTheDocument();
  });

  it("商品が無いときカードを出さない", () => {
    render(<ProductList items={[]} />);

    expect(screen.queryAllByTestId("product-card")).toHaveLength(0);
  });

  it("画像 URL が無ければ画像を出さない", () => {
    render(<ProductList items={[{ product: product(), imageUrl: null }]} />);

    expect(screen.queryByAltText("ワイヤレスイヤホン")).not.toBeInTheDocument();
  });
});
