// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { ProductRef } from "@/model/product/product";

const { getProductCategories } = vi.hoisted(() => ({ getProductCategories: vi.fn() }));
const { ProductListResults } = vi.hoisted(() => ({
  ProductListResults: vi.fn(() => <p>一覧と件数</p>),
}));

vi.mock("@/adapters/server/api/product-masters", () => ({ getProductCategories }));
vi.mock("./results", () => ({ ProductListResults }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/adapters/client/api/products", () => ({ fetchProductCount: vi.fn(async () => 0) }));

import { ProductListPageContent } from "./page-content";

const CATEGORIES: readonly ProductRef[] = [
  { id: "0195f0c2-0000-7000-8000-0000000000c1", name: "オーディオ" },
  { id: "0195f0c2-0000-7000-8000-0000000000c2", name: "ウェアラブル" },
];

beforeEach(() => {
  getProductCategories.mockReset().mockResolvedValue(CATEGORIES);
  ProductListResults.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ProductListPageContent", () => {
  it("条件で変わらない分類を絞り込みへ並べる", async () => {
    render(await ProductListPageContent({ searchParams: {} }));

    expect(screen.getAllByRole("group", { name: "カテゴリ" })[0]).toBeInTheDocument();
    expect(screen.getAllByLabelText("オーディオ")[0]).toBeInTheDocument();
  });

  it("条件で変わるものを待機表示の境界の内側へ置く", async () => {
    render(await ProductListPageContent({ searchParams: {} }));

    expect(await screen.findByText("一覧と件数")).toBeVisible();
  });

  it("URL の条件を契約に照らして取得条件へ渡す", async () => {
    render(await ProductListPageContent({ searchParams: { keyword: "イヤホン", first: "20" } }));

    expect(ProductListResults).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({ keyword: "イヤホン", first: 20 }),
      }),
      undefined,
    );
  });

  it("件数の指定が無ければ 1 度に読み込む件数を補う", async () => {
    render(await ProductListPageContent({ searchParams: {} }));

    expect(ProductListResults).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.objectContaining({ first: 24 }) }),
      undefined,
    );
  });

  it("検索欄に現在のキーワードを引き継ぐ", async () => {
    render(await ProductListPageContent({ searchParams: { keyword: "イヤホン" } }));

    expect(screen.getByRole("searchbox", { name: "商品名で探す" })).toHaveValue("イヤホン");
  });

  it("明示された並び順を選択済みにする", async () => {
    render(await ProductListPageContent({ searchParams: { sort: "publishedAt" } }));

    expect(screen.getByRole("option", { name: "古い順", selected: true })).toBeInTheDocument();
  });

  it("既定の並び順は選択肢の「指定なし」へ寄せる", async () => {
    render(await ProductListPageContent({ searchParams: { sort: "-publishedAt" } }));

    expect(screen.getByRole("option", { name: "新着順", selected: true })).toBeInTheDocument();
  });

  it("契約を外れた条件では一覧の代わりに案内を出す", async () => {
    render(await ProductListPageContent({ searchParams: { sort: "-price" } }));

    expect(screen.getByText("この条件では商品を表示できません")).toBeVisible();
    expect(screen.getByText("確認する条件: 並び替え")).toBeVisible();
  });

  it("契約を外れた条件では取得へ進まない", async () => {
    render(await ProductListPageContent({ searchParams: { categoryCodes: "not-a-uuid" } }));

    expect(ProductListResults).not.toHaveBeenCalled();
    expect(screen.queryByRole("searchbox", { name: "商品名で探す" })).not.toBeInTheDocument();
  });

  it("契約を外れた条件の呼び名を、画面上の言葉へ直して出す", async () => {
    render(await ProductListPageContent({ searchParams: { minPrice: "やすい" } }));

    expect(screen.getByText("確認する条件: 価格の下限")).toBeVisible();
  });

  it("a11y 違反を持たない", async () => {
    const { container } = render(await ProductListPageContent({ searchParams: {} }));

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
