// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { toProductId } from "@/model/product/product";

import type { AdminRankingRow } from "../../ranking-rows";
import { RankingTable } from "./ranking-table";

const ID = toProductId("0195f0c2-0000-7000-8000-000000000001");

const ROWS: readonly AdminRankingRow[] = [
  { id: ID, rank: 1, name: "ワイヤレスイヤホン", price: "129.99", soldQuantity: 1234 },
];

describe("RankingTable", () => {
  it("順位・商品名・販売数を並べる", () => {
    render(<RankingTable rows={ROWS} />);

    const [, row] = within(screen.getByRole("table")).getAllByRole("row");

    expect(row).toBeDefined();
    expect(within(row ?? screen.getByRole("table")).getByText("1")).toBeInTheDocument();
    expect(
      within(row ?? screen.getByRole("table")).getByText("ワイヤレスイヤホン"),
    ).toBeInTheDocument();
    expect(within(row ?? screen.getByRole("table")).getByText("1,234")).toBeInTheDocument();
  });

  it("商品名から利用者向けの商品の面へ出る", () => {
    render(<RankingTable rows={ROWS} />);

    expect(screen.getByRole("link", { name: "ワイヤレスイヤホン" })).toHaveAttribute(
      "href",
      `/products/${ID}`,
    );
  });

  it("行全体は押せない", () => {
    render(<RankingTable rows={ROWS} />);

    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("見出しに期間を書く", () => {
    render(<RankingTable rows={ROWS} />);

    expect(screen.getByRole("heading", { name: "売れ筋の商品（直近 30 日）" })).toBeInTheDocument();
  });

  it("行が無ければ、無いと判る文言を出す", () => {
    render(<RankingTable rows={[]} />);

    expect(screen.getByText("直近 30 日に売れた商品はありません。")).toBeInTheDocument();
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<RankingTable rows={ROWS} />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
