// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  CAPPED_RATE_DISCOUNT_PURCHASE,
  PURCHASE_DETAIL,
  TOTAL_REFERENCE,
} from "../purchase.fixture";
import { PurchaseAmountSummary } from "./amount-summary";

const ROW_LABELS = /^(小計|クーポン値引き|税|送料)$/;

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

  it("値引きが 0 なら値引きの行を出さない", () => {
    render(<PurchaseAmountSummary purchase={PURCHASE_DETAIL} reference={null} />);

    expect(screen.getAllByText(ROW_LABELS).map((label) => label.textContent)).toEqual([
      "小計",
      "税",
      "送料",
    ]);
  });

  it("値引きが 0 なら、適用クーポンがあっても値引きの行を出さない", () => {
    render(
      <PurchaseAmountSummary
        purchase={{ ...CAPPED_RATE_DISCOUNT_PURCHASE, discountAmount: 0 }}
        reference={null}
      />,
    );

    expect(screen.queryByText("クーポン値引き")).not.toBeInTheDocument();
  });

  it("値引きの行が無ければ、渡された値引きの中身も描かない", () => {
    render(
      <PurchaseAmountSummary
        discountDetail={<p>値引きの中身</p>}
        purchase={PURCHASE_DETAIL}
        reference={null}
      />,
    );

    expect(screen.queryByText("値引きの中身")).not.toBeInTheDocument();
  });

  it("小計 → クーポン値引き → 税 → 送料 の順に並べる", () => {
    render(<PurchaseAmountSummary purchase={CAPPED_RATE_DISCOUNT_PURCHASE} reference={null} />);

    expect(screen.getAllByText(ROW_LABELS).map((label) => label.textContent)).toEqual([
      "小計",
      "クーポン値引き",
      "税",
      "送料",
    ]);
  });

  it("値引きを差し引く額として負の符号で出す", () => {
    render(<PurchaseAmountSummary purchase={CAPPED_RATE_DISCOUNT_PURCHASE} reference={null} />);

    expect(screen.getByText("-$10.00").closest("p")).toHaveTextContent("クーポン値引き");
  });

  it("値引きの中身を値引きの行の直下、税の行より前に描く", () => {
    render(
      <PurchaseAmountSummary
        discountDetail={<p>値引きの中身</p>}
        purchase={CAPPED_RATE_DISCOUNT_PURCHASE}
        reference={null}
      />,
    );

    expect(
      screen
        .getAllByText(/^(クーポン値引き|値引きの中身|税)$/)
        .map((element) => element.textContent),
    ).toEqual(["クーポン値引き", "値引きの中身", "税"]);
  });

  it("値引きがあっても参考換算額は合計にだけ添える", async () => {
    render(
      <PurchaseAmountSummary
        purchase={CAPPED_RATE_DISCOUNT_PURCHASE}
        reference={TOTAL_REFERENCE}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "円で見る" }));

    expect(screen.getAllByText(/参考/)).toHaveLength(1);
    expect(screen.getByText("クーポン値引き").closest("p")).not.toHaveTextContent(/参考/);
  });

  it("値引きの行と中身を含めても a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <PurchaseAmountSummary
        discountDetail={<p>値引きの中身</p>}
        purchase={CAPPED_RATE_DISCOUNT_PURCHASE}
        reference={TOTAL_REFERENCE}
      />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <PurchaseAmountSummary purchase={PURCHASE_DETAIL} reference={TOTAL_REFERENCE} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
