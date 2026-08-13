// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import type { ProductRankingEntry } from "@/model/product/product";

import { RankingList } from "./ranking-list";

const ENTRIES: readonly ProductRankingEntry[] = [
  {
    productId: "0195f0c2-0000-7000-8000-000000000001",
    name: "ワイヤレスイヤホン",
    price: "19.99",
    soldQuantity: 128,
  },
  {
    productId: "0195f0c2-0000-7000-8000-000000000002",
    name: "スマートウォッチ",
    price: "129.00",
    soldQuantity: 96,
  },
];

describe("RankingList", () => {
  it("順序に意味のある一覧として並べる", () => {
    render(<RankingList entries={ENTRIES} />);

    const items = within(screen.getByRole("list")).getAllByRole("listitem");

    expect(items).toHaveLength(2);
    expect(items[0]?.textContent).toContain("ワイヤレスイヤホン");
    expect(items[1]?.textContent).toContain("スマートウォッチ");
  });

  it("順位を本文として示す", () => {
    render(<RankingList entries={ENTRIES} />);

    const [first, second] = within(screen.getByRole("list")).getAllByRole("listitem");

    expect(first?.textContent).toContain("1");
    expect(second?.textContent).toContain("2");
  });

  it("販売数量と価格を示す", () => {
    render(<RankingList entries={ENTRIES} />);

    expect(screen.getByText("128 個")).toBeVisible();
    expect(screen.getByText("$19.99")).toBeVisible();
  });

  it("商品名だけを詳細への導線にする", () => {
    render(<RankingList entries={ENTRIES} />);

    expect(screen.getByRole("link", { name: "ワイヤレスイヤホン" })).toHaveAttribute(
      "href",
      "/products/0195f0c2-0000-7000-8000-000000000001",
    );
  });

  it("先頭の行にだけ区切り線を出さない", () => {
    render(<RankingList entries={ENTRIES} />);

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    const separatorsIn = (item: HTMLElement | undefined) =>
      item === undefined ? -1 : within(item).queryAllByRole("separator").length;

    expect(separatorsIn(items[0])).toBe(0);
    expect(separatorsIn(items[1])).toBe(1);
  });

  it("件数が無ければ節ごと描かない", () => {
    render(<RankingList entries={[]} />);

    expect(screen.queryByRole("heading", { name: "売上ランキング" })).not.toBeInTheDocument();
  });

  it("a11y 違反が無い", async () => {
    const { container } = render(<RankingList entries={ENTRIES} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
