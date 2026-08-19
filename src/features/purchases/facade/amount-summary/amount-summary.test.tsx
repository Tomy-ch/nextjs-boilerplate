// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PURCHASE_DETAIL, TOTAL_REFERENCE } from "../purchase.fixture";
import { PurchaseAmountSummary } from "./amount-summary";

describe("PurchaseAmountSummary", () => {
  it("小計・税・送料・合計を出す", () => {
    render(<PurchaseAmountSummary purchase={PURCHASE_DETAIL} reference={null} />);

    expect(screen.getByText("$188.97")).toBeVisible();
    expect(screen.getByText("$18.90")).toBeVisible();
    expect(screen.getByText("$5.00")).toBeVisible();
    expect(screen.getByText("$212.87")).toBeVisible();
  });

  it("参考換算額は合計にだけ添える", async () => {
    render(<PurchaseAmountSummary purchase={PURCHASE_DETAIL} reference={TOTAL_REFERENCE} />);

    await userEvent.click(screen.getByRole("button", { name: "円で見る" }));

    expect(screen.getAllByText(/参考/)).toHaveLength(1);
  });

  it("参考換算額が無いときは切り替えを出さない", () => {
    render(<PurchaseAmountSummary purchase={PURCHASE_DETAIL} reference={null} />);

    expect(screen.queryByRole("button", { name: "円で見る" })).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <PurchaseAmountSummary purchase={PURCHASE_DETAIL} reference={TOTAL_REFERENCE} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
