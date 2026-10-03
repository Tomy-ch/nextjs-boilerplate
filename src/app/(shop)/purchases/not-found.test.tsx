// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import PurchaseHistoryNotFound from "./not-found";

describe("PurchaseHistoryNotFound", () => {
  it("見つからなかったことを見出しで伝える", () => {
    render(<PurchaseHistoryNotFound />);

    expect(screen.getByRole("heading", { name: "対象が見つかりません。" })).toBeVisible();
  });

  it("購入履歴へ戻る導線を 1 本だけ出す", () => {
    render(<PurchaseHistoryNotFound />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName("購入履歴へ戻る");
    expect(links[0]).toHaveAttribute("href", "/purchases");
  });

  it("指し先が無いのか他人のものかを言い分けない", () => {
    render(<PurchaseHistoryNotFound />);

    expect(screen.queryByText(/権限|他の利用者/)).not.toBeInTheDocument();
  });

  it("a11y 違反を持たない", async () => {
    const { container } = render(<PurchaseHistoryNotFound />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
