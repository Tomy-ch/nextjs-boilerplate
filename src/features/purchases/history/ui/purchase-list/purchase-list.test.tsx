// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { purchaseDetailPath } from "../../../facade/paths/paths";
import { HISTORY_ENTRIES } from "../../../purchases.fixture";
import { PurchaseLoadMoreList } from "./purchase-list";

const ENTRIES = HISTORY_ENTRIES.map((purchase) => ({
  purchase,
  href: purchaseDetailPath(purchase.code),
}));

describe("PurchaseLoadMoreList", () => {
  it("読み込み済みの購入を並べる", () => {
    render(<PurchaseLoadMoreList entries={ENTRIES} loadMore={{ status: "idle" }} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(ENTRIES.length);
  });

  it("読み込み済みの件数を読み上げへ伝える", () => {
    render(<PurchaseLoadMoreList entries={ENTRIES} loadMore={{ status: "idle" }} />);

    expect(screen.getByText("4 件を表示中")).toHaveAttribute("aria-live", "polite");
  });

  it("総数は出さない", () => {
    render(<PurchaseLoadMoreList entries={ENTRIES} loadMore={{ status: "idle" }} />);

    expect(screen.queryByText(/全 .* 件中/)).not.toBeInTheDocument();
  });

  it("続きがあるあいだは読み直す操作を出さない", () => {
    render(<PurchaseLoadMoreList entries={ENTRIES} loadMore={{ status: "idle" }} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("失敗したときだけ読み直させる", async () => {
    const onRetry = vi.fn();

    render(<PurchaseLoadMoreList entries={ENTRIES} loadMore={{ status: "failed", onRetry }} />);
    await userEvent.click(screen.getByRole("button", { name: "もう一度読み込む" }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("1 件も無くても件数の告知は出す", () => {
    render(<PurchaseLoadMoreList entries={[]} loadMore={{ status: "exhausted" }} />);

    expect(screen.getByText("0 件を表示中")).toBeVisible();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <PurchaseLoadMoreList entries={ENTRIES} loadMore={{ status: "loading" }} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
