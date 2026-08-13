// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import type { ProductRef } from "@/model/product/product";

import { CategoryLinks } from "./category-links";

const CATEGORIES: readonly ProductRef[] = [
  { id: "c1", name: "オーディオ" },
  { id: "c2", name: "ウェアラブル" },
];

describe("CategoryLinks", () => {
  // ----- 正常系 -----
  it("分類ごとに一覧への導線を出す", () => {
    render(<CategoryLinks categories={CATEGORIES} />);

    expect(screen.getByRole("link", { name: "オーディオ" })).toHaveAttribute(
      "href",
      "/products?categoryId=c1",
    );
    expect(screen.getByRole("link", { name: "ウェアラブル" })).toHaveAttribute(
      "href",
      "/products?categoryId=c2",
    );
  });

  it("節の見出しを出す", () => {
    render(<CategoryLinks categories={CATEGORIES} />);

    expect(screen.getByRole("heading", { name: "カテゴリから探す" })).toBeVisible();
  });

  // ----- 異常系 -----
  it("分類が無ければ節ごと描かない", () => {
    render(<CategoryLinks categories={[]} />);

    expect(screen.queryByRole("heading", { name: "カテゴリから探す" })).not.toBeInTheDocument();
  });

  it("a11y 違反が無い", async () => {
    const { container } = render(<CategoryLinks categories={CATEGORIES} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
