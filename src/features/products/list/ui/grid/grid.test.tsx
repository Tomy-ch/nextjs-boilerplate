// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import type { ProductListItem } from "@/model/product/product";
import { useCartStore } from "@/stores/cart-store";

import { ProductGrid } from "./grid";

function item(index: number, overrides: Partial<ProductListItem> = {}): ProductListItem {
  return {
    id: `0195f0c2-0000-7000-8000-${String(index).padStart(12, "0")}`,
    name: `商品${index}`,
    price: "19.99",
    quantity: 12,
    categoryName: "オーディオ",
    statusName: "公開",
    imageUrl: `/products/${index}.png`,
    ...overrides,
  };
}

const ITEMS: readonly ProductListItem[] = [item(1), item(2), item(3), item(4)];

describe("ProductGrid", () => {
  beforeEach(() => {
    useCartStore.setState({ lines: [], isOpen: false });
  });

  it("渡された商品を並べる", () => {
    render(<ProductGrid items={ITEMS} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByRole("link", { name: "商品1" })).toBeVisible();
    expect(screen.getByRole("link", { name: "商品4" })).toBeVisible();
  });

  it("並べた商品それぞれが詳細を指す", () => {
    render(<ProductGrid items={ITEMS} />);

    expect(screen.getByRole("link", { name: "商品2" })).toHaveAttribute(
      "href",
      "/products/0195f0c2-0000-7000-8000-000000000002",
    );
  });

  it("先頭 3 件の画像だけ後回しにしない", () => {
    render(<ProductGrid items={ITEMS} />);

    expect(screen.getByRole("img", { name: "商品1" })).not.toHaveAttribute("loading");
    expect(screen.getByRole("img", { name: "商品2" })).not.toHaveAttribute("loading");
    expect(screen.getByRole("img", { name: "商品3" })).not.toHaveAttribute("loading");
    expect(screen.getByRole("img", { name: "商品4" })).toHaveAttribute("loading", "lazy");
  });

  it("商品が無いとき次にすべきことを示す", () => {
    render(<ProductGrid items={[]} />);

    expect(screen.getByText("条件に合う商品がありません")).toBeVisible();
    expect(screen.getByText(/絞り込みを外して/)).toBeVisible();
  });

  it("商品が無いとき並びそのものを出さない", () => {
    render(<ProductGrid items={[]} />);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<ProductGrid items={ITEMS} />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
