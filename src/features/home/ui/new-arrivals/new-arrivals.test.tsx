// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import type { ProductListItem } from "@/model/product/product";

import { NewArrivals } from "./new-arrivals";

function itemOf(id: string, name: string): ProductListItem {
  return {
    id,
    name,
    price: "19.99",
    quantity: 12,
    categoryName: "オーディオ",
    statusName: "公開",
    imageUrl: null,
  };
}

const ITEMS: readonly ProductListItem[] = [
  itemOf("0195f0c2-0000-7000-8000-000000000001", "ワイヤレスイヤホン"),
  itemOf("0195f0c2-0000-7000-8000-000000000002", "スマートウォッチ"),
];

describe("NewArrivals", () => {
  // ----- 正常系 -----
  it("渡された商品を並べる", () => {
    render(<NewArrivals items={ITEMS} />);

    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("ワイヤレスイヤホン")).toBeVisible();
  });

  it("一覧への導線を出す", () => {
    render(<NewArrivals items={ITEMS} />);

    expect(screen.getByRole("link", { name: "すべての商品を見る" })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  it("節の見出しを出す", () => {
    render(<NewArrivals items={ITEMS} />);

    expect(screen.getByRole("heading", { name: "新着商品" })).toBeVisible();
  });

  // ----- 異常系 -----
  it("商品が無ければ節ごと描かない", () => {
    render(<NewArrivals items={[]} />);

    expect(screen.queryByRole("heading", { name: "新着商品" })).not.toBeInTheDocument();
  });

  it("a11y 違反が無い", async () => {
    const { container } = render(<NewArrivals items={ITEMS} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
