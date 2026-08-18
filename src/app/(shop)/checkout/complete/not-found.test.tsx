// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import CheckoutCompleteNotFound from "./not-found";

describe("CheckoutCompleteNotFound", () => {
  it("見つからなかったことを見出しで伝える", () => {
    render(<CheckoutCompleteNotFound />);

    expect(screen.getByRole("heading", { name: "対象が見つかりません。" })).toBeVisible();
  });

  it("控えの一覧へ向かう導線を出す", () => {
    render(<CheckoutCompleteNotFound />);

    expect(screen.getByRole("link", { name: "購入の控えを見る" })).toHaveAttribute(
      "href",
      "/mypage",
    );
  });

  it("指し先が無いのか他人のものかを言い分けない", () => {
    render(<CheckoutCompleteNotFound />);

    expect(screen.queryByText(/権限|他の利用者/)).not.toBeInTheDocument();
  });

  it("a11y 違反を持たない", async () => {
    const { container } = render(<CheckoutCompleteNotFound />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
