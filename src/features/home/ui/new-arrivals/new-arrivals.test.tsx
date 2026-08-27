// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import type { ProductListItem } from "@/model/product/product";
import { toProductId } from "@/model/product/product";

import { NewArrivals } from "./new-arrivals";

function itemOf(id: string, name: string): ProductListItem {
  return {
    id: toProductId(id),
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

/** 折り返し前として扱う件数の境界をまたぐだけ並べる。 */
const OVER_LEADING: readonly ProductListItem[] = Array.from({ length: 5 }, (_, index) =>
  itemOf(`0195f0c2-0000-7000-8000-00000000000${index + 1}`, `商品 ${index + 1}`),
);

describe("NewArrivals", () => {
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

  it("折り返し前の件数だけ画像を後回しにしない", () => {
    render(<NewArrivals items={OVER_LEADING} />);

    const images = screen.getAllByRole("img", { name: "画像なし" });
    const [first, , , fourth, fifth] = images;

    expect(images).toHaveLength(5);
    expect(first).not.toHaveAttribute("loading");
    expect(fourth).not.toHaveAttribute("loading");
    expect(fifth).toHaveAttribute("loading", "lazy");
  });

  it("商品が無ければ節ごと描かない", () => {
    render(<NewArrivals items={[]} />);

    expect(screen.queryByRole("heading", { name: "新着商品" })).not.toBeInTheDocument();
  });

  it("a11y 違反が無い", async () => {
    const { container } = render(<NewArrivals items={ITEMS} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
