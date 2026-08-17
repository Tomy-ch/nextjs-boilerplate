// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import type { ProductCategory } from "@/model/product/product";

import { CategoryLinks } from "./category-links";

const CATEGORIES: readonly ProductCategory[] = [
  { id: "10", code: 10, name: "オーディオ" },
  { id: "20", code: 20, name: "ウェアラブル" },
];

describe("CategoryLinks", () => {
  it("分類ごとに一覧への導線を出す", () => {
    render(<CategoryLinks categories={CATEGORIES} />);

    expect(screen.getByRole("link", { name: "オーディオ" })).toHaveAttribute(
      "href",
      "/products?categoryCodes=10",
    );
    expect(screen.getByRole("link", { name: "ウェアラブル" })).toHaveAttribute(
      "href",
      "/products?categoryCodes=20",
    );
  });

  it("節の見出しを出す", () => {
    render(<CategoryLinks categories={CATEGORIES} />);

    expect(screen.getByRole("heading", { name: "カテゴリから探す" })).toBeVisible();
  });

  it("分類が無ければ節ごと描かない", () => {
    render(<CategoryLinks categories={[]} />);

    expect(screen.queryByRole("heading", { name: "カテゴリから探す" })).not.toBeInTheDocument();
  });

  it("a11y 違反が無い", async () => {
    const { container } = render(<CategoryLinks categories={CATEGORIES} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
