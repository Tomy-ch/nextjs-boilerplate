// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import type { ProductDiscontinueImpact } from "@/model/product/product";

import { DiscontinueImpactSummary } from "./impact-summary";

const RELOAD_HREF = "/admin/products/p1/discontinue";

function renderSummary(impact: Partial<ProductDiscontinueImpact> = {}) {
  return render(
    <DiscontinueImpactSummary
      impact={{
        affectedCartCount: 1_234,
        affectedUserCount: 37,
        inProgressPurchaseCount: 0,
        ...impact,
      }}
      reloadHref={RELOAD_HREF}
    />,
  );
}

/** 見出しの項目と同じ枠に置かれた値と注記を読む。 */
function figureOf(label: string): HTMLElement {
  const term = screen.getByText(label);

  if (term.parentElement === null) {
    throw new Error(`${label} の枠が見つからない`);
  }

  return term.parentElement;
}

const UNTOUCHED_TEXT = "この商品はどのカートにも入っていないため、代替クーポンは発行されません。";

describe("DiscontinueImpactSummary", () => {
  // ----- 影響があるとき -----
  it("3 つの数を、それぞれの単位と桁区切りで出す", () => {
    renderSummary();

    expect(within(figureOf("この商品が入っているカート")).getByText("1,234")).toBeInTheDocument();
    expect(within(figureOf("この商品が入っているカート")).getByText("件")).toBeInTheDocument();
    expect(within(figureOf("代替クーポンを受け取る利用者")).getByText("37")).toBeInTheDocument();
    expect(within(figureOf("代替クーポンを受け取る利用者")).getByText("人")).toBeInTheDocument();
    expect(within(figureOf("この商品を含む進行中の購入")).getByText("0")).toBeInTheDocument();
  });

  it("数ごとに、数えている母集団の注記を同じ枠に添える", () => {
    renderSummary();

    expect(
      within(figureOf("この商品が入っているカート")).getByText(
        /持ち主の決まっていないカートも含みます/,
      ),
    ).toBeInTheDocument();
    expect(
      within(figureOf("代替クーポンを受け取る利用者")).getByText(/退会した利用者は含みません/),
    ).toBeInTheDocument();
    expect(
      within(figureOf("この商品を含む進行中の購入")).getByText(
        /1 件でも残っていると廃番にできません/,
      ),
    ).toBeInTheDocument();
  });

  it("出している数が読み込んだ時点の値で、実行の結果ではないことを添える", () => {
    renderSummary();

    expect(screen.getByText(/実行したときの結果とは一致しないことがあります/)).toBeInTheDocument();
  });

  it("取り直す導線を、この画面自身へ向けて常設する", () => {
    renderSummary();

    expect(screen.getByRole("link", { name: "読み込み直す" })).toHaveAttribute("href", RELOAD_HREF);
  });

  it("どれか 1 つでも 0 でなければ、どのカートにも無いとは言わない", () => {
    renderSummary({ affectedCartCount: 0, affectedUserCount: 0, inProgressPurchaseCount: 1 });

    expect(screen.queryByText(UNTOUCHED_TEXT)).not.toBeInTheDocument();
  });

  it("カートの数だけが残っていても、どのカートにも無いとは言わない", () => {
    renderSummary({ affectedCartCount: 1, affectedUserCount: 0, inProgressPurchaseCount: 0 });

    expect(screen.queryByText(UNTOUCHED_TEXT)).not.toBeInTheDocument();
  });

  it("利用者の数だけが残っていても、どのカートにも無いとは言わない", () => {
    renderSummary({ affectedCartCount: 0, affectedUserCount: 1, inProgressPurchaseCount: 0 });

    expect(screen.queryByText(UNTOUCHED_TEXT)).not.toBeInTheDocument();
  });

  it("a11y 検査を通る", async () => {
    const { container } = renderSummary();

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  // ----- 影響が無いとき -----
  it("3 つとも 0 なら、クーポンが発行されないことを書く", () => {
    renderSummary({ affectedCartCount: 0, affectedUserCount: 0, inProgressPurchaseCount: 0 });

    expect(screen.getByText(UNTOUCHED_TEXT)).toBeInTheDocument();
  });
});
