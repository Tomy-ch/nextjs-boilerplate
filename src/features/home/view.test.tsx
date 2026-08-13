// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import type { ProductListItem, ProductRankingEntry, ProductRef } from "@/model/product/product";

import { HomeView, type HomeViewProps } from "./view";

const ITEM: ProductListItem = {
  id: "0195f0c2-0000-7000-8000-000000000001",
  name: "ワイヤレスイヤホン",
  price: "19.99",
  quantity: 12,
  categoryName: "オーディオ",
  statusName: "公開",
  imageUrl: null,
};

const ENTRY: ProductRankingEntry = {
  productId: "0195f0c2-0000-7000-8000-000000000002",
  name: "スマートウォッチ",
  price: "129.00",
  soldQuantity: 96,
};

const CATEGORY: ProductRef = { id: "c1", name: "オーディオ" };

const FAILURE = "現在サービスを利用できません。";

function renderView(overrides: Partial<HomeViewProps> = {}) {
  return render(
    <HomeView
      categories={{ status: "ready", value: [CATEGORY] }}
      newArrivals={{ status: "ready", value: [ITEM] }}
      ranking={{ status: "ready", value: [ENTRY] }}
      {...overrides}
    />,
  );
}

describe("HomeView", () => {
  // ----- 正常系 -----
  it("3 つの節を積む", () => {
    renderView();

    expect(screen.getByRole("heading", { name: "新着商品" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "売上ランキング" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "カテゴリから探す" })).toBeVisible();
  });

  it("画像のある帯・行の帯・小さな導線の帯の順に並べる", () => {
    renderView();

    const headings = screen.getAllByRole("heading").map((heading) => heading.textContent);

    expect(headings).toEqual(["新着商品", "売上ランキング", "カテゴリから探す"]);
  });

  it("a11y 違反が無い", async () => {
    const { container } = renderView();

    expect((await axe(container)).violations).toEqual([]);
  });

  // ----- 異常系 -----
  it("落ちた節だけを失敗表示へ差し替える", () => {
    renderView({ ranking: { status: "failed", message: FAILURE } });

    expect(screen.getByText("売上ランキングを表示できませんでした")).toBeVisible();
    expect(screen.getByRole("heading", { name: "新着商品" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "カテゴリから探す" })).toBeVisible();
  });

  it("すべて落ちても、どれが落ちたかを節ごとに述べる", () => {
    renderView({
      categories: { status: "failed", message: FAILURE },
      newArrivals: { status: "failed", message: FAILURE },
      ranking: { status: "failed", message: FAILURE },
    });

    expect(screen.getByText("新着商品を表示できませんでした")).toBeVisible();
    expect(screen.getByText("売上ランキングを表示できませんでした")).toBeVisible();
    expect(screen.getByText("カテゴリを表示できませんでした")).toBeVisible();
  });

  it("取得できても中身が無い節は描かない", () => {
    renderView({
      categories: { status: "ready", value: [] },
      newArrivals: { status: "ready", value: [] },
      ranking: { status: "ready", value: [] },
    });

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
