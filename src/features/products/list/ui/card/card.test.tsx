// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import type { Product } from "@/model/product/product";

import { ProductCard } from "./card";

const PRODUCT: Product = {
  id: "1",
  name: "スタンドライト",
  description: null,
  price: "4980.00",
  quantity: 3,
  stockWarningThreshold: null,
  status: { id: "1", name: "公開中" },
  category: { id: "10", name: "デスク周り" },
  publishedAt: null,
  imagePaths: [],
};

describe("ProductCard", () => {
  // ----- 正常系 -----
  it("名称・分類・価格・在庫数を表示する", () => {
    render(<ProductCard imageUrl={null} product={PRODUCT} />);

    expect(screen.getByText("スタンドライト")).toBeInTheDocument();
    expect(screen.getByText("デスク周り")).toBeInTheDocument();
    expect(screen.getByText("$4980.00")).toBeInTheDocument();
    expect(screen.getByText("在庫 3")).toBeInTheDocument();
  });

  it("画像があれば名称を代替テキストにして表示する", () => {
    render(<ProductCard imageUrl="/products/1.png" product={PRODUCT} />);

    expect(screen.getByRole("img", { name: "スタンドライト" })).toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<ProductCard imageUrl={null} product={PRODUCT} />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  it("画像が無ければ代替画像を出す", () => {
    render(<ProductCard imageUrl={null} product={PRODUCT} />);

    expect(screen.getByRole("img", { name: "画像なし" })).toBeInTheDocument();
  });

  it("在庫が無ければ在庫なしを添える", () => {
    render(<ProductCard imageUrl={null} product={{ ...PRODUCT, quantity: 0 }} />);

    expect(screen.getByText("在庫なし")).toBeInTheDocument();
  });
});
