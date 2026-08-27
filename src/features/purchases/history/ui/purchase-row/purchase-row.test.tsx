// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { HISTORY_ENTRIES, LARGE_AMOUNT_ENTRY } from "../../../purchases.fixture";
import { PurchaseRow } from "./purchase-row";

const [UNPROCESSED, , DELIVERED, CANCELED] = HISTORY_ENTRIES;

function renderRow(purchase = UNPROCESSED ?? LARGE_AMOUNT_ENTRY) {
  return render(
    <ul>
      <PurchaseRow href="/purchases/x" purchase={purchase} />
    </ul>,
  );
}

describe("PurchaseRow", () => {
  it("注文日時・購入コード・状況・合計を出す", () => {
    renderRow();

    expect(screen.getByText("2026/08/17 10:30")).toBeVisible();
    expect(screen.getByText("0195f0c2-0000-7000-9000-000000000001")).toBeVisible();
    expect(screen.getByText("未処理")).toBeVisible();
    expect(screen.getByText("$212.87")).toBeVisible();
  });

  it("行そのものを詳細への行き先にする", () => {
    renderRow();

    expect(screen.getByRole("link")).toHaveAttribute("href", "/purchases/x");
  });

  it("届いた購入は望ましい終端として示す", () => {
    renderRow(DELIVERED ?? LARGE_AMOUNT_ENTRY);

    expect(screen.getByText("配達済み")).toHaveAttribute("data-variant", "success");
  });

  it("取り消された購入は取り消しとして示す", () => {
    renderRow(CANCELED ?? LARGE_AMOUNT_ENTRY);

    expect(screen.getByText("キャンセル")).toHaveAttribute("data-variant", "destructive");
  });

  it("まだ動いている購入には色を付けない", () => {
    renderRow(LARGE_AMOUNT_ENTRY);

    expect(screen.getByText("支払い済み")).toHaveAttribute("data-variant", "secondary");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderRow();

    expect((await axe(container)).violations).toEqual([]);
  });
});
