// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { ProductCategory } from "@/model/product/product";

const { getProductCategories } = vi.hoisted(() => ({ getProductCategories: vi.fn() }));

vi.mock("@/adapters/server/api/product-masters", () => ({ getProductCategories }));

import { HomeCategoriesContent } from "./categories-content";

const CATEGORIES: readonly ProductCategory[] = [{ id: "c1", code: 10, name: "オーディオ" }];

beforeEach(() => {
  getProductCategories.mockReset().mockResolvedValue(CATEGORIES);
});

describe("HomeCategoriesContent", () => {
  // ----- 正常系 -----
  it("分類から一覧へ入る導線を描く", async () => {
    render(await HomeCategoriesContent());

    expect(screen.getByRole("link", { name: "オーディオ" })).toBeInTheDocument();
  });

  it("分類が無ければ節ごと描かない", async () => {
    getProductCategories.mockResolvedValue([]);

    const { container } = render(await HomeCategoriesContent());

    expect(container).toBeEmptyDOMElement();
  });

  it("a11y 違反を持たない", async () => {
    const { container } = render(await HomeCategoriesContent());

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  // ----- 異常系 -----
  it("分類を読めなければ、表示へ畳まずそのまま投げる", async () => {
    getProductCategories.mockRejectedValue(new Error("読めない"));

    await expect(HomeCategoriesContent()).rejects.toThrow("読めない");
  });
});
