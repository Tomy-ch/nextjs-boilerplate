// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PURCHASE, TOTAL_REFERENCE } from "../checkout.fixture";
import { CheckoutCompleteView } from "./view";

describe("CheckoutCompleteView", () => {
  // ----- 正常系 -----
  it("成立したことを先に伝える", () => {
    render(<CheckoutCompleteView purchase={PURCHASE} reference={TOTAL_REFERENCE} />);

    expect(screen.getByText("ご注文ありがとうございます。")).toBeVisible();
  });

  it("控え・内訳・購入した明細を並べる", () => {
    render(<CheckoutCompleteView purchase={PURCHASE} reference={TOTAL_REFERENCE} />);

    expect(screen.getByText("ご注文の控え")).toBeVisible();
    expect(screen.getByText("$212.87")).toBeVisible();
    expect(screen.getByText("ご購入いただいた商品")).toBeVisible();
  });

  it("次の導線を 2 本置く", () => {
    render(<CheckoutCompleteView purchase={PURCHASE} reference={TOTAL_REFERENCE} />);

    expect(screen.getByRole("link", { name: "買い物を続ける" })).toHaveAttribute(
      "href",
      "/products",
    );
    expect(screen.getByRole("link", { name: "購入の控えを見る" })).toHaveAttribute(
      "href",
      "/mypage",
    );
  });

  // ----- 異常系 -----
  it("参考換算額が無くても成り立つ", () => {
    render(<CheckoutCompleteView purchase={PURCHASE} reference={null} />);

    expect(screen.getByText("$212.87")).toBeVisible();
    expect(screen.queryByRole("button", { name: "円で見る" })).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <CheckoutCompleteView purchase={PURCHASE} reference={TOTAL_REFERENCE} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
