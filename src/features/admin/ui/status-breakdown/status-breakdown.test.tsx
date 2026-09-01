// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import type { PurchaseStatusCount } from "@/model/dashboard/dashboard";

import { StatusBreakdown } from "./status-breakdown";

const COUNTS: readonly PurchaseStatusCount[] = [
  { statusId: "2", statusName: "支払い済み", count: 1234 },
  { statusId: "1", statusName: "検討中", count: 22 },
];

describe("StatusBreakdown", () => {
  // ----- 件数が無いとき -----
  it("この期間に購入が無いと出す", () => {
    render(<StatusBreakdown counts={[]} />);

    expect(screen.getByText("この期間に注文された購入はありません。")).toBeInTheDocument();
  });

  it("表も図も出さない", () => {
    render(<StatusBreakdown counts={[]} />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  // ----- 件数があるとき -----
  it("契約が返した順序のまま並べる", () => {
    render(<StatusBreakdown counts={COUNTS} />);

    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);

    expect(rows.map((row) => within(row).getAllByRole("cell")[0]?.textContent)).toEqual([
      "支払い済み",
      "検討中",
    ]);
  });

  it("件数を桁区切りで出す", () => {
    render(<StatusBreakdown counts={COUNTS} />);

    expect(within(screen.getByRole("table")).getByText("1,234")).toBeInTheDocument();
  });

  it("合計を出さない", () => {
    render(<StatusBreakdown counts={COUNTS} />);

    expect(screen.queryByText("1,256")).not.toBeInTheDocument();
    expect(screen.queryByText(/合計/)).not.toBeInTheDocument();
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<StatusBreakdown counts={COUNTS} />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
