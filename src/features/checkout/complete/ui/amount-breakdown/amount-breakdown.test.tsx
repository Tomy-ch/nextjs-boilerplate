// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PURCHASE, TOTAL_REFERENCE } from "../../../checkout.fixture";
import { AmountBreakdown } from "./amount-breakdown";

describe("AmountBreakdown", () => {
  // ----- 正常系 -----
  it("小計・税・送料・合計を出す", () => {
    render(<AmountBreakdown purchase={PURCHASE} reference={null} />);

    expect(screen.getByText("$188.97")).toBeVisible();
    expect(screen.getByText("$18.90")).toBeVisible();
    expect(screen.getByText("$5.00")).toBeVisible();
    expect(screen.getByText("$212.87")).toBeVisible();
  });

  it("参考換算額は合計にだけ添える", async () => {
    render(<AmountBreakdown purchase={PURCHASE} reference={TOTAL_REFERENCE} />);

    await userEvent.click(screen.getByRole("button", { name: "円で見る" }));

    expect(screen.getAllByText(/参考/)).toHaveLength(1);
    expect(screen.getByText("約 ￥31,931（参考）")).toBeVisible();
  });

  // ----- 異常系 -----
  it("参考換算額が無いときは切り替えを出さない", () => {
    render(<AmountBreakdown purchase={PURCHASE} reference={null} />);

    expect(screen.queryByRole("button", { name: "円で見る" })).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <AmountBreakdown purchase={PURCHASE} reference={TOTAL_REFERENCE} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
