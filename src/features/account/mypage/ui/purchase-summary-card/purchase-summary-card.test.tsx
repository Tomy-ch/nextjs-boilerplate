// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  EMPTY_PURCHASE_HISTORY,
  EMPTY_PURCHASE_SUMMARY,
  PURCHASE_HISTORY,
  PURCHASE_SUMMARY,
} from "../../../account.fixture";
import { PurchaseSummaryCard } from "./purchase-summary-card";

describe("PurchaseSummaryCard", () => {
  it("ステータス別の内訳を契約が返した順に並べる", () => {
    render(<PurchaseSummaryCard purchases={PURCHASE_HISTORY} summary={PURCHASE_SUMMARY} />);

    const statusNames = screen
      .getAllByRole("rowheader")
      .map((header) => header.textContent)
      .filter((name) => name !== "合計");

    expect(statusNames).toEqual(["配達済み", "発送済み"]);
  });

  it("件数と金額を内訳の行ごとに出す", () => {
    render(<PurchaseSummaryCard purchases={PURCHASE_HISTORY} summary={PURCHASE_SUMMARY} />);

    const row = screen.getByRole("row", { name: /配達済み/ });

    expect(within(row).getByText("8 件")).toBeVisible();
    expect(within(row).getByText("$820.00")).toBeVisible();
  });

  it("キャンセルを除いた総数と合計を最後の行に出す", () => {
    render(<PurchaseSummaryCard purchases={PURCHASE_HISTORY} summary={PURCHASE_SUMMARY} />);

    const total = screen.getByRole("row", { name: /合計/ });

    expect(within(total).getByText("11 件")).toBeVisible();
    expect(within(total).getByText("$1,150.00")).toBeVisible();
  });

  it("caption を置かず、表のスクロール領域の名前で支援技術に伝える", () => {
    render(<PurchaseSummaryCard purchases={PURCHASE_HISTORY} summary={PURCHASE_SUMMARY} />);

    expect(screen.getByLabelText("ステータス別の購入内訳")).toContainElement(
      screen.getByRole("table"),
    );
    expect(screen.queryByRole("caption")).not.toBeInTheDocument();
  });

  it("購入が無いとき列だけの表を出さず、文言で伝える", () => {
    render(
      <PurchaseSummaryCard purchases={EMPTY_PURCHASE_HISTORY} summary={EMPTY_PURCHASE_SUMMARY} />,
    );

    expect(screen.getByText("まだ購入がありません。")).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("履歴を開く操作をカードの見出しに置く", () => {
    render(<PurchaseSummaryCard purchases={PURCHASE_HISTORY} summary={PURCHASE_SUMMARY} />);

    expect(screen.getByRole("button", { name: "もっと見る" })).toBeEnabled();
  });

  it("購入が無いとき履歴を開く操作を押せなくする", () => {
    render(
      <PurchaseSummaryCard purchases={EMPTY_PURCHASE_HISTORY} summary={EMPTY_PURCHASE_SUMMARY} />,
    );

    expect(screen.getByRole("button", { name: "もっと見る" })).toBeDisabled();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <PurchaseSummaryCard purchases={PURCHASE_HISTORY} summary={PURCHASE_SUMMARY} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
