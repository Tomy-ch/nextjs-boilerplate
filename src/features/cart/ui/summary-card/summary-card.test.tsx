// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { CART, CART_WITHOUT_PURCHASABLE } from "../../cart.fixture";
import { CartSummaryCard } from "./summary-card";

describe("CartSummaryCard", () => {
  it("小計と購入手続きへの導線を出す", () => {
    render(<CartSummaryCard cart={CART} />);

    expect(screen.getByText("$188.97")).toBeVisible();
    expect(screen.getByRole("link", { name: "購入手続きへ" })).toBeVisible();
  });

  it("何を合算した金額かを添える", () => {
    render(<CartSummaryCard cart={CART} />);

    expect(screen.getByText("買える明細だけを合算した金額です。")).toBeVisible();
    expect(screen.getByText("送料や税は購入手続きで確定します。")).toBeVisible();
  });

  it("買える明細があるとき、進めない理由を出さない", () => {
    render(<CartSummaryCard cart={CART} />);

    expect(screen.queryByText(/今すぐ買える商品がありません/)).not.toBeInTheDocument();
  });

  it("買える明細が無いとき、進めない理由と次に取る行動を出す", () => {
    render(<CartSummaryCard cart={CART_WITHOUT_PURCHASABLE} />);

    expect(screen.getByText(/今すぐ買える商品がありません/)).toBeVisible();
    expect(screen.getByRole("button", { name: "購入手続きへ" })).toBeDisabled();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<CartSummaryCard cart={CART} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
