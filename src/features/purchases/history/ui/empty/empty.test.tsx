// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PurchaseHistoryEmpty } from "./empty";

describe("PurchaseHistoryEmpty", () => {
  it("購入がまだ無いときは、商品を探しに戻る導線だけを出す", () => {
    render(<PurchaseHistoryEmpty reason="none" />);

    expect(screen.getByText("購入がまだありません。")).toBeVisible();
    expect(screen.getByRole("link", { name: "商品を探す" })).toHaveAttribute("href", "/products");
  });

  it("絞り込んだ結果が無いときは、条件を外せば出てくることを示す", () => {
    render(<PurchaseHistoryEmpty reason="filtered" resetHref="/purchases" />);

    expect(screen.getByText("この期間の購入はありません。")).toBeVisible();
    expect(screen.getByRole("link", { name: "全期間で見る" })).toHaveAttribute(
      "href",
      "/purchases",
    );
  });

  it("購入がまだ無いときに、条件を外す導線を出さない", () => {
    render(<PurchaseHistoryEmpty reason="none" />);

    expect(screen.queryByRole("link", { name: "全期間で見る" })).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<PurchaseHistoryEmpty reason="none" />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
