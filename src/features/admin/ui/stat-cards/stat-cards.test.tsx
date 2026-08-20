// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import type { SummaryCard } from "../../summary-cards";
import { StatCards } from "./stat-cards";

const CARDS: readonly SummaryCard[] = [
  { id: "sales-amount", label: "売上", value: "$1,234.56", note: "キャンセルを除きます" },
  {
    id: "published-product-count",
    label: "公開中の商品",
    value: "454",
    note: "現在の数です",
    href: "/admin/products",
    linkLabel: "公開中の商品を一覧で見る",
  },
];

function renderCards() {
  return render(<StatCards cards={CARDS} label="集計" />);
}

describe("StatCards", () => {
  it("名前と値と注記を組にして並べる", () => {
    renderCards();

    expect(screen.getByText("売上")).toBeInTheDocument();
    expect(screen.getByText("$1,234.56")).toBeInTheDocument();
    expect(screen.getByText("キャンセルを除きます")).toBeInTheDocument();
  });

  it("行き先のあるカードだけが link になる", () => {
    renderCards();

    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("link の読み上げ名は linkLabel を使う", () => {
    renderCards();

    expect(screen.getByRole("link", { name: "公開中の商品を一覧で見る" })).toHaveAttribute(
      "href",
      "/admin/products",
    );
  });

  it("一覧自体に見出しの名前が付く", () => {
    renderCards();

    expect(within(screen.getByRole("region", { name: "集計" })).getByText("売上")).toBeVisible();
  });

  it("a11y 検査を通る", async () => {
    const { container } = renderCards();

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
