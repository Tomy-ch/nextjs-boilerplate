// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { AmountWithReference } from "./amount-with-reference";

const REFERENCE = {
  currency: "JPY",
  amount: 28_346,
  rate: "150.00",
  rateDate: "2026-08-17",
};

describe("AmountWithReference", () => {
  it("見出しと基準通貨の金額を出す", () => {
    render(<AmountWithReference amount={18_897} label="小計" reference={REFERENCE} />);

    expect(screen.getByText("小計")).toBeVisible();
    expect(screen.getByText("$188.97")).toBeVisible();
  });

  it("脇や帯へ収めるときは、金額を小さい方の大きさで出す", () => {
    render(
      <AmountWithReference amount={18_897} label="小計" reference={REFERENCE} size="compact" />,
    );

    expect(screen.getByText("$188.97")).toHaveClass("text-lg");
  });

  it("指定が無ければ、金額を主役の大きさで出す", () => {
    render(<AmountWithReference amount={18_897} label="小計" reference={REFERENCE} />);

    expect(screen.getByText("$188.97")).toHaveClass("text-2xl");
  });

  it("切り替える前は参考換算額を出さない", () => {
    render(<AmountWithReference amount={18_897} label="小計" reference={REFERENCE} />);

    expect(screen.queryByText(/参考/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "円で見る" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("切り替えると、参考換算額とレートの根拠が出る", async () => {
    render(<AmountWithReference amount={18_897} label="小計" reference={REFERENCE} />);

    await userEvent.click(screen.getByRole("button", { name: "円で見る" }));

    expect(screen.getByText("約 ￥28,346（参考）")).toBeVisible();
    expect(screen.getByText("1 USD = 150.00 JPY・基準日 2026-08-17")).toBeVisible();
  });

  it("切り替えても基準通貨の金額は出したままにする", async () => {
    render(<AmountWithReference amount={18_897} label="小計" reference={REFERENCE} />);

    await userEvent.click(screen.getByRole("button", { name: "円で見る" }));

    expect(screen.getByText("$188.97")).toBeVisible();
  });
  it("参考換算額が無いときは切り替えごと出さない", () => {
    render(<AmountWithReference amount={18_897} label="小計" reference={null} />);

    expect(screen.queryByRole("button", { name: "円で見る" })).not.toBeInTheDocument();
    expect(screen.getByText("$188.97")).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <AmountWithReference amount={18_897} label="小計" reference={REFERENCE} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
