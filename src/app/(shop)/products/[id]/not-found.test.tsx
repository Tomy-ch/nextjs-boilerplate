// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProductDetailNotFound from "./not-found";

describe("ProductDetailNotFound", () => {
  // ----- 正常系 -----
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
});
