// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import ProductDetailNotFound from "./not-found";

describe("ProductDetailNotFound", () => {
  it("見つからなかったことを見出しで伝える", () => {
    render(<ProductDetailNotFound />);

    expect(screen.getByRole("heading", { name: "対象が見つかりません。" })).toBeVisible();
  });

  it("一覧へ戻る導線を出す", () => {
    render(<ProductDetailNotFound />);

    expect(screen.getByRole("link", { name: "商品一覧へ戻る" })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  it("a11y 違反を持たない", async () => {
    const { container } = render(<ProductDetailNotFound />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
