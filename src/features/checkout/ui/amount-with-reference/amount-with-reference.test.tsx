// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { SUBTOTAL_REFERENCE } from "../../checkout.fixture";
import { AmountWithReference } from "./amount-with-reference";

describe("AmountWithReference", () => {
  // ----- 正常系 -----
  it("見出しと基準通貨の金額を出す", () => {
    render(<AmountWithReference amount={18_897} label="小計" reference={SUBTOTAL_REFERENCE} />);

    expect(screen.getByText("小計")).toBeVisible();
    expect(screen.getByText("$188.97")).toBeVisible();
  });

  it("切り替える前は参考換算額を出さない", () => {
    render(<AmountWithReference amount={18_897} label="小計" reference={SUBTOTAL_REFERENCE} />);

    expect(screen.queryByText(/参考/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "円で見る" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("切り替えると、参考換算額とレートの根拠が出る", async () => {
    render(<AmountWithReference amount={18_897} label="小計" reference={SUBTOTAL_REFERENCE} />);

    await userEvent.click(screen.getByRole("button", { name: "円で見る" }));

    expect(screen.getByText("約 ￥28,346（参考）")).toBeVisible();
    expect(screen.getByText("1 USD = 150.00 JPY・基準日 2026-08-17")).toBeVisible();
  });

  it("切り替えても基準通貨の金額は出したままにする", async () => {
    render(<AmountWithReference amount={18_897} label="小計" reference={SUBTOTAL_REFERENCE} />);

    await userEvent.click(screen.getByRole("button", { name: "円で見る" }));

    expect(screen.getByText("$188.97")).toBeVisible();
  });

  // ----- 異常系 -----
  it("参考換算額が無いときは切り替えごと出さない", () => {
    render(<AmountWithReference amount={18_897} label="小計" reference={null} />);

    expect(screen.queryByRole("button", { name: "円で見る" })).not.toBeInTheDocument();
    expect(screen.getByText("$188.97")).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <AmountWithReference amount={18_897} label="小計" reference={SUBTOTAL_REFERENCE} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
