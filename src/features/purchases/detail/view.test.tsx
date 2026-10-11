// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  CAPPED_RATE_DISCOUNT_PURCHASE,
  PURCHASE_DETAIL,
  TOTAL_REFERENCE,
} from "../facade/purchase.fixture";
import { PurchaseDetailView } from "./view";

describe("PurchaseDetailView", () => {
  it("控え・内訳・明細を出す", () => {
    render(<PurchaseDetailView purchase={PURCHASE_DETAIL} reference={TOTAL_REFERENCE} />);

    expect(screen.getByText("ご注文の控え")).toBeVisible();
    expect(screen.getByText("$212.87")).toBeVisible();
    expect(screen.getByText("ご購入いただいた商品")).toBeVisible();
  });

  it("パンくずの現在地を注文番号にする", () => {
    render(<PurchaseDetailView purchase={PURCHASE_DETAIL} reference={null} />);

    const breadcrumb = screen.getByRole("navigation", { name: "パンくずリスト" });

    expect(breadcrumb).toHaveTextContent(PURCHASE_DETAIL.code);
    expect(screen.getByRole("link", { name: "購入履歴" })).toHaveAttribute("href", "/purchases");
  });

  it("紙には控えと内訳と明細だけを出す", () => {
    render(<PurchaseDetailView purchase={PURCHASE_DETAIL} reference={null} />);

    expect(screen.getByRole("navigation", { name: "パンくずリスト" })).toHaveClass("print-hidden");
    expect(screen.getByRole("button", { name: "印刷する" })).toHaveClass("print-hidden");
    expect(screen.getByRole("link", { name: "購入履歴へ戻る" }).parentElement).toHaveClass(
      "print-hidden",
    );
    expect(screen.getByRole("button", { name: "支払う" }).closest(".print-hidden")).not.toBeNull();
    for (const kept of ["ご注文の控え", "$212.87", "ご購入いただいた商品"]) {
      expect(screen.getByText(kept).closest(".print-hidden")).toBeNull();
    }
  });

  it("紙へ出す操作と、次の行き先を置く", () => {
    render(<PurchaseDetailView purchase={PURCHASE_DETAIL} reference={null} />);

    expect(screen.getByRole("button", { name: "印刷する" })).toBeVisible();
    expect(screen.getByRole("link", { name: "購入履歴へ戻る" })).toHaveAttribute(
      "href",
      "/purchases",
    );
    expect(screen.getByRole("link", { name: "買い物を続ける" })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  it("注文番号の見出しを持つが、画面には出さない", () => {
    render(<PurchaseDetailView purchase={PURCHASE_DETAIL} reference={null} />);

    const heading = screen.getByRole("heading", { level: 1 });

    expect(heading).toHaveTextContent(PURCHASE_DETAIL.code);
    expect(heading).toHaveClass("sr-only");
  });

  it("参考換算額を引けなかったときは切り替えを出さない", () => {
    render(<PurchaseDetailView purchase={PURCHASE_DETAIL} reference={null} />);

    expect(screen.queryByRole("button", { name: "円で見る" })).not.toBeInTheDocument();
  });

  it("値引きの行の直下に、適用したクーポンの 1 行を出す", () => {
    render(<PurchaseDetailView purchase={CAPPED_RATE_DISCOUNT_PURCHASE} reference={null} />);

    const coupon = screen.getByText("10% 引き（上限 $10.00）・全商品が対象");

    expect(coupon.previousElementSibling).toHaveTextContent("クーポン値引き");
  });

  it("紙にはクーポンの 1 行を含めて内訳を出す", () => {
    render(<PurchaseDetailView purchase={CAPPED_RATE_DISCOUNT_PURCHASE} reference={null} />);

    expect(
      screen.getByText("10% 引き（上限 $10.00）・全商品が対象").closest(".print-hidden"),
    ).toBeNull();
  });

  it("値引きの無い購入には、値引きの行もクーポンの 1 行も出さない", () => {
    render(<PurchaseDetailView purchase={PURCHASE_DETAIL} reference={null} />);

    expect(screen.queryByText("クーポン値引き")).not.toBeInTheDocument();
    expect(screen.queryByText(/が対象$/)).not.toBeInTheDocument();
  });

  it("適用クーポンが無ければ、値引きの行だけを出す", () => {
    render(
      <PurchaseDetailView
        purchase={{ ...CAPPED_RATE_DISCOUNT_PURCHASE, appliedCoupon: null }}
        reference={null}
      />,
    );

    expect(screen.getByText("クーポン値引き")).toBeVisible();
    expect(screen.queryByText(/が対象$/)).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <PurchaseDetailView purchase={PURCHASE_DETAIL} reference={TOTAL_REFERENCE} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
