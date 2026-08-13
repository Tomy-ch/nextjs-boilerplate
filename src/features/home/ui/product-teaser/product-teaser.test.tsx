// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import type { ProductListItem } from "@/model/product/product";

import { ProductTeaser } from "./product-teaser";

function itemOf(overrides: Partial<ProductListItem> = {}): ProductListItem {
  return {
    id: "0195f0c2-0000-7000-8000-000000000001",
    name: "ワイヤレスイヤホン",
    price: "19.99",
    quantity: 12,
    categoryName: "オーディオ",
    statusName: "公開",
    imageUrl: "https://media.example.test/products/abc.png",
    ...overrides,
  };
}

describe("ProductTeaser", () => {
  // ----- 正常系 -----
  it("商品名と価格を示す", () => {
    render(<ProductTeaser item={itemOf()} />);

    expect(screen.getByText("ワイヤレスイヤホン")).toBeVisible();
    expect(screen.getByText("$19.99")).toBeVisible();
  });

  it("カード全体を詳細への導線にする", () => {
    render(<ProductTeaser item={itemOf()} />);

    expect(screen.getByRole("link", { name: /ワイヤレスイヤホン/ })).toHaveAttribute(
      "href",
      "/products/0195f0c2-0000-7000-8000-000000000001",
    );
  });

  it("一覧のカードが持つ判断材料を持たない", () => {
    render(<ProductTeaser item={itemOf()} />);

    expect(screen.queryByText("オーディオ")).not.toBeInTheDocument();
    expect(screen.queryByText("公開")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /カート/ })).not.toBeInTheDocument();
  });

  it("価格を decimal 文字列のまま示す", () => {
    render(<ProductTeaser item={itemOf({ price: "0.001" })} />);

    expect(screen.getByText("$0.001")).toBeVisible();
  });

  // ----- 異常系 -----
  it("画像が無い商品には代替画像を置く", () => {
    render(<ProductTeaser item={itemOf({ imageUrl: null })} />);

    expect(screen.getByRole("img", { name: "画像なし" })).toBeInTheDocument();
  });

  it("a11y 違反が無い", async () => {
    const { container } = render(<ProductTeaser item={itemOf()} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
