// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { PURCHASE_HISTORY_PATH } from "@/features/purchases/facade/paths/paths";
import {
  EMPTY_PURCHASE_HISTORY,
  PURCHASE_HISTORY,
  TRUNCATED_PURCHASE_HISTORY,
} from "../../../account.fixture";
import { PurchaseHistoryDialog } from "./purchase-history-dialog";

/** 表の行のうち、見出し行を除いた購入の行。 */
function purchaseRows() {
  return within(screen.getByRole("table"))
    .getAllByRole("row")
    .filter((row) => within(row).queryAllByRole("columnheader").length === 0);
}

/** 購入の行を位置で引く。無ければ落とす。 */
function purchaseRow(index: number): HTMLElement {
  const row = purchaseRows()[index];

  if (row === undefined) {
    throw new Error(`購入の行が ${index + 1} 行ありません`);
  }

  return row;
}

/** 面を開く。 */
async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "もっと見る" }));
  await screen.findByRole("dialog");
}

describe("PurchaseHistoryDialog", () => {
  it("既定では面を開かず、押せる操作だけを出す", () => {
    render(<PurchaseHistoryDialog purchases={PURCHASE_HISTORY} />);

    expect(screen.getByRole("button", { name: "もっと見る" })).toBeEnabled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("購入が無いとき開く操作を押せなくする", () => {
    render(<PurchaseHistoryDialog purchases={EMPTY_PURCHASE_HISTORY} />);

    expect(screen.getByRole("button", { name: "もっと見る" })).toBeDisabled();
  });

  it("開くと上限の 10 件までしか並べない", async () => {
    const user = userEvent.setup();

    render(<PurchaseHistoryDialog purchases={PURCHASE_HISTORY} />);
    await open(user);

    expect(purchaseRows()).toHaveLength(10);
  });

  it("注文日時・ステータス・購入コード・金額を 1 行に出す", async () => {
    const user = userEvent.setup();

    render(<PurchaseHistoryDialog purchases={PURCHASE_HISTORY} />);
    await open(user);

    const first = within(purchaseRow(0));
    const purchase = PURCHASE_HISTORY.items[0];

    expect(first.getByText("2026/07/01 12:00")).toBeVisible();
    expect(first.getByText(String(purchase?.statusName))).toBeVisible();
    expect(first.getByText(String(purchase?.code))).toBeVisible();
    expect(first.getByText("$49.80")).toBeVisible();
  });

  it("契約が返した降順の並びをそのまま保つ", async () => {
    const user = userEvent.setup();

    render(<PurchaseHistoryDialog purchases={PURCHASE_HISTORY} />);
    await open(user);

    expect(purchaseRows().map((row) => within(row).getByRole("rowheader").textContent)).toEqual(
      PURCHASE_HISTORY.items.slice(0, 10).map(({ code }) => code),
    );
  });

  it("切り捨てた分があるとき、全部ではないことを説明に書く", async () => {
    const user = userEvent.setup();

    render(<PurchaseHistoryDialog purchases={PURCHASE_HISTORY} />);
    await open(user);

    expect(screen.getByText(/これより古い購入は購入履歴で確認できます/)).toBeVisible();
  });

  it("切り捨てた分があるとき購入履歴への導線を出す", async () => {
    const user = userEvent.setup();

    render(<PurchaseHistoryDialog purchases={PURCHASE_HISTORY} />);
    await open(user);

    expect(screen.getByRole("link", { name: "購入履歴をすべて見る" })).toHaveAttribute(
      "href",
      PURCHASE_HISTORY_PATH,
    );
  });

  it("表示しきれているとき導線を出さず、並び順だけを説明する", async () => {
    const user = userEvent.setup();
    const purchases = { items: PURCHASE_HISTORY.items.slice(0, 3), nextCursor: null };

    render(<PurchaseHistoryDialog purchases={purchases} />);
    await open(user);

    expect(screen.getByText("注文日時の新しい順に並んでいます。")).toBeVisible();
    expect(screen.queryByRole("link", { name: "購入履歴をすべて見る" })).not.toBeInTheDocument();
  });

  it("件数が上限以下でも続きのカーソルがあれば全部ではないと伝える", async () => {
    const user = userEvent.setup();
    const purchases = {
      items: TRUNCATED_PURCHASE_HISTORY.items.slice(0, 3),
      nextCursor: TRUNCATED_PURCHASE_HISTORY.nextCursor,
    };

    render(<PurchaseHistoryDialog purchases={purchases} />);
    await open(user);

    expect(screen.getByRole("link", { name: "購入履歴をすべて見る" })).toBeVisible();
  });

  it("表を外側のスクロール領域で包まず、高さの上限を表の側へ渡す", async () => {
    const user = userEvent.setup();

    render(<PurchaseHistoryDialog purchases={PURCHASE_HISTORY} />);
    await open(user);

    expect(screen.getByRole("table").parentElement).toHaveClass("max-h-96");
    expect(screen.getByRole("table").parentElement?.parentElement).not.toHaveClass("max-h-96");
  });

  it("期間で絞る操作を持たない", async () => {
    const user = userEvent.setup();

    render(<PurchaseHistoryDialog purchases={PURCHASE_HISTORY} />);
    await open(user);

    expect(screen.queryByRole("button", { name: /期間|絞/ })).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<PurchaseHistoryDialog purchases={PURCHASE_HISTORY} />);

    await open(user);

    expect((await axe(baseElement)).violations).toEqual([]);
  });
});
