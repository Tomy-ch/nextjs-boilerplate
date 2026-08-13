// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { ProductListItem } from "@/model/product/product";
import { useCartStore } from "@/stores/cart-store";

import { ProductLoadMoreList } from "./load-more-list";

function item(index: number): ProductListItem {
  return {
    id: `0195f0c2-0000-7000-8000-${String(index).padStart(12, "0")}`,
    name: `商品${index}`,
    price: "19.99",
    quantity: 12,
    categoryName: "オーディオ",
    statusName: "公開",
    imageUrl: null,
  };
}

const ITEMS: readonly ProductListItem[] = [item(1), item(2), item(3)];

describe("ProductLoadMoreList", () => {
  beforeEach(() => {
    useCartStore.setState({ lines: [], isOpen: false });
  });

  // ----- 正常系 -----
  it("読み込み済みの商品を並べる", () => {
    render(<ProductLoadMoreList hasNext={false} items={ITEMS} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("総数が分かれば全体の何件中かを示す", () => {
    render(<ProductLoadMoreList hasNext items={ITEMS} total={10} />);

    expect(screen.getByText("全 10 件中 3 件を表示中")).toBeVisible();
  });

  it("総数が分からなければ読み込み済みの件数だけを示す", () => {
    render(<ProductLoadMoreList hasNext items={ITEMS} />);

    expect(screen.getByText("3 件を表示中")).toBeVisible();
  });

  it("続きがあれば末尾を見張る目印を置く", () => {
    const sentinelRef = createRef<HTMLDivElement>();
    render(<ProductLoadMoreList hasNext items={ITEMS} sentinelRef={sentinelRef} />);

    expect(sentinelRef.current).toBeInTheDocument();
  });

  it("続きがあっても取得中でなければ進行を伝えない", () => {
    render(<ProductLoadMoreList hasNext items={ITEMS} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("取得中は進行を伝える", () => {
    render(<ProductLoadMoreList hasNext items={ITEMS} loading />);

    expect(screen.getByRole("status", { name: "続きを読み込んでいます" })).toBeVisible();
  });

  it("取得中でも読み直す操作は出さない", () => {
    render(<ProductLoadMoreList hasNext items={ITEMS} loading onLoadMore={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "もう一度読み込む" })).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <ProductLoadMoreList failed hasNext items={ITEMS} onLoadMore={vi.fn()} total={10} />,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  // ----- 異常系 -----
  it("続きが無ければ末尾を見張る目印を置かない", () => {
    const sentinelRef = createRef<HTMLDivElement>();
    render(<ProductLoadMoreList hasNext={false} items={ITEMS} sentinelRef={sentinelRef} />);

    expect(sentinelRef.current).toBeNull();
  });

  it("失敗したときだけ読み直す操作を出す", () => {
    render(<ProductLoadMoreList failed hasNext items={ITEMS} onLoadMore={vi.fn()} />);

    expect(screen.getByText("続きを読み込めませんでした。")).toBeVisible();
    expect(screen.getByRole("button", { name: "もう一度読み込む" })).toBeVisible();
  });

  it("読み直す操作を押すと続きの取得を頼む", async () => {
    const onLoadMore = vi.fn();
    render(<ProductLoadMoreList failed hasNext items={ITEMS} onLoadMore={onLoadMore} />);

    await userEvent.click(screen.getByRole("button", { name: "もう一度読み込む" }));

    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it("失敗しても続きが無ければ読み直す操作を出さない", () => {
    render(<ProductLoadMoreList failed hasNext={false} items={ITEMS} onLoadMore={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "もう一度読み込む" })).not.toBeInTheDocument();
  });

  it("1 件も無ければ 0 件として空の案内を出す", () => {
    render(<ProductLoadMoreList hasNext={false} items={[]} total={0} />);

    expect(screen.getByText("全 0 件中 0 件を表示中")).toBeVisible();
    expect(screen.getByText("条件に合う商品がありません")).toBeVisible();
  });
});
