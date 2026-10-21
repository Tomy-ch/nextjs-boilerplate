// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { formatDateTime } from "@/model/datetime";
import { formatMoney } from "@/model/money";
import type { PurchaseHistoryEntry } from "@/model/purchase/purchase";
import { PURCHASE_STATUS } from "@/model/purchase/purchase-status";

import { DiscontinueRemainingPurchases, type RemainingPurchasesState } from "./remaining-purchases";

const RELOAD_HREF = "/admin/products/p1/discontinue";

const PURCHASES = [
  {
    code: "0195f0c2-0000-7000-9000-000000000021",
    totalAmount: 1_999,
    statusCode: PURCHASE_STATUS.UNPROCESSED,
    statusName: "未処理",
    orderedAt: new Date("2026-08-10T11:20:00+09:00"),
  },
  {
    code: "0195f0c2-0000-7000-9000-000000000022",
    totalAmount: 25_480,
    statusCode: PURCHASE_STATUS.PAID,
    statusName: "支払い済み",
    orderedAt: new Date("2026-08-11T09:05:00+09:00"),
  },
] satisfies readonly [PurchaseHistoryEntry, ...PurchaseHistoryEntry[]];

function renderPurchases(state: RemainingPurchasesState) {
  return render(<DiscontinueRemainingPurchases reloadHref={RELOAD_HREF} state={state} />);
}

const FAILED_TEXT = "残っている購入を読み込めませんでした。";

describe("DiscontinueRemainingPurchases", () => {
  // ----- 待っているとき -----
  it("待っている間は並びの代わりに枠を出し、支援技術へ読ませない", () => {
    const { container } = renderPurchases({ status: "loading" });

    const placeholders = container.querySelectorAll('[data-slot="skeleton"]');

    expect(placeholders).toHaveLength(3);
    expect(placeholders[0]?.parentElement).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByText(FAILED_TEXT)).not.toBeInTheDocument();
  });

  it("待っている間も、何が廃番を止めているのかを説明する", () => {
    renderPurchases({ status: "loading" });

    expect(screen.getByRole("heading", { name: "残っている進行中の購入" })).toBeInTheDocument();
    expect(screen.getByText(/完了・キャンセル・配達済みのいずれかになるまで/)).toBeInTheDocument();
  });

  // ----- 読めなかったとき -----
  it("読めなかったことと、この画面自身を取り直す導線を出す", () => {
    renderPurchases({ status: "failed" });

    expect(screen.getByText(FAILED_TEXT)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "読み込み直す" })).toHaveAttribute("href", RELOAD_HREF);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("読めなかったときの a11y 検査を通る", async () => {
    const { container } = renderPurchases({ status: "failed" });

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  // ----- 並んでいるとき -----
  it("購入ごとに注文番号・状態・注文日時・合計を 1 行で出す", () => {
    renderPurchases({ status: "ready", items: PURCHASES, partial: false });

    const rows = within(screen.getByRole("list")).getAllByRole("listitem");
    const [first] = PURCHASES;

    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(first.code);
    expect(rows[0]).toHaveTextContent("未処理");
    expect(rows[0]).toHaveTextContent(
      `${formatDateTime(first.orderedAt)} / ${formatMoney(first.totalAmount)}`,
    );
  });

  it("行はどこへもつながらない", () => {
    renderPurchases({ status: "ready", items: PURCHASES, partial: false });

    const list = screen.getByRole("list");

    expect(within(list).queryByRole("link")).not.toBeInTheDocument();
    expect(within(list).queryByRole("button")).not.toBeInTheDocument();
  });

  it("全件を並べていれば、ほかにもあるとは言わない", () => {
    renderPurchases({ status: "ready", items: PURCHASES, partial: false });

    expect(screen.queryByText(/ほかにも進行中の購入があり/)).not.toBeInTheDocument();
    expect(screen.queryByText(FAILED_TEXT)).not.toBeInTheDocument();
  });

  it("全件でなければ、並べた件数とほかにもあることを添える", () => {
    renderPurchases({ status: "ready", items: PURCHASES, partial: true });

    expect(
      screen.getByText(
        "2 件を表示しています。ほかにも進行中の購入があり、ここには並んでいません。",
      ),
    ).toBeInTheDocument();
  });

  it("並べたものが無くても、全件でなければ 0 件と添える", () => {
    renderPurchases({ status: "ready", items: [], partial: true });

    expect(within(screen.getByRole("list")).queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.getByText(/^0 件を表示しています。/)).toBeInTheDocument();
  });

  it("並んでいるときの a11y 検査を通る", async () => {
    const { container } = renderPurchases({ status: "ready", items: PURCHASES, partial: true });

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
