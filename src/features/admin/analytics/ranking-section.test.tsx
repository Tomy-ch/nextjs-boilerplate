// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { type ProductRankingEntry, toProductId } from "@/model/product/product";

const { getProductRanking } = vi.hoisted(() => ({ getProductRanking: vi.fn() }));

vi.mock("@/adapters/server/api/products", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/products")>()),
  getProductRanking,
}));

import { AnalyticsRankingSection } from "./ranking-section";

const FIRST = toProductId("0195f0c2-0000-7000-8000-000000000001");
const SECOND = toProductId("0195f0c2-0000-7000-8000-000000000002");

const RANKING: readonly ProductRankingEntry[] = [
  { productId: FIRST, name: "ワイヤレスイヤホン", price: "129.99", soldQuantity: 1234 },
  { productId: SECOND, name: "モバイルバッテリー", price: "49.50", soldQuantity: 1234 },
];

beforeEach(() => {
  vi.clearAllMocks();
  getProductRanking.mockResolvedValue(RANKING);
});

describe("AnalyticsRankingSection", () => {
  it("直近 30 日の売れ筋を求める", async () => {
    render(await AnalyticsRankingSection());

    expect(getProductRanking).toHaveBeenCalledWith({ period: "30d", limit: 10 });
  });

  it("表として一覧できる件数に留める", async () => {
    render(await AnalyticsRankingSection());

    expect(getProductRanking.mock.calls[0]?.[0]?.limit).toBeLessThanOrEqual(10);
  });

  it("契約の並びをそのまま順位にする", async () => {
    render(await AnalyticsRankingSection());

    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);

    expect(rows.map((row) => within(row).getAllByRole("cell")[0]?.textContent)).toEqual(["1", "2"]);
  });

  it("見出しに取得した期間を書く", async () => {
    render(await AnalyticsRankingSection());

    expect(screen.getByRole("heading", { name: "売れ筋の商品（直近 30 日）" })).toBeInTheDocument();
  });

  it("売れた商品が無ければ、無いと判る文言を出す", async () => {
    getProductRanking.mockResolvedValue([]);

    render(await AnalyticsRankingSection());

    expect(screen.getByText("直近 30 日に売れた商品はありません。")).toBeInTheDocument();
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(await AnalyticsRankingSection());

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
