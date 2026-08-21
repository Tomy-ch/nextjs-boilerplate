// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { StockCurrentAmount } from "./current-stock";

const RELOAD_HREF = "/admin/products/p1/stock";

function renderAmount(quantity = 128) {
  return render(
    <StockCurrentAmount
      productName="ワイヤレスイヤホン"
      quantity={quantity}
      reloadHref={RELOAD_HREF}
    />,
  );
}

describe("StockCurrentAmount", () => {
  it("対象の商品名と在庫の数を出す", () => {
    renderAmount();

    expect(screen.getByText("ワイヤレスイヤホン")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
  });

  it("在庫が尽きていても、補充の起点として 0 を出す", () => {
    renderAmount(0);

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("出している数が読み込んだ時点の写しであることを添える", () => {
    renderAmount();

    expect(screen.getByText(/読み込んだ時点の値です/)).toBeInTheDocument();
  });

  it("取り直す導線を、この画面自身へ向けて常設する", () => {
    renderAmount();

    expect(screen.getByRole("link", { name: "読み込み直す" })).toHaveAttribute("href", RELOAD_HREF);
  });

  it("a11y 検査を通る", async () => {
    const { container } = renderAmount();

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
