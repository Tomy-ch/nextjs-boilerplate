// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { CursorPage } from "@/model/pagination";
import type { ProductListItem } from "@/model/product/product";

const { useInfiniteProducts } = vi.hoisted(() => ({ useInfiniteProducts: vi.fn() }));

vi.mock("../../use-infinite-products", () => ({ useInfiniteProducts }));

import { ProductInfiniteList } from "./infinite-list";

const ITEM: ProductListItem = {
  id: "0195f0c2-0000-7000-8000-000000000001",
  name: "スタンドライト",
  price: "4980.00",
  quantity: 3,
  categoryName: "デスク周り",
  statusName: "公開中",
  imageUrl: null,
};

const INITIAL: CursorPage<ProductListItem> = { items: [ITEM], nextCursor: "cursor-1" };
const QUERY: Readonly<Record<string, string>> = { keyword: "ライト" };

type Observed = {
  items?: readonly ProductListItem[];
  hasNext?: boolean;
  loading?: boolean;
  failed?: boolean;
  loadMore?: () => void;
};

function observing({
  items = [ITEM],
  hasNext = false,
  loading = false,
  failed = false,
  loadMore = vi.fn(),
}: Observed = {}) {
  const sentinelRef = createRef<HTMLDivElement>();

  useInfiniteProducts.mockReturnValue({ items, hasNext, loading, failed, loadMore, sentinelRef });

  return sentinelRef;
}

describe("ProductInfiniteList", () => {
  beforeEach(() => {
    useInfiniteProducts.mockReset();
  });

  it("読み込み済みの商品を並べる", () => {
    observing();

    render(<ProductInfiniteList initial={INITIAL} query={QUERY} />);

    expect(screen.getByText("スタンドライト")).toBeVisible();
  });

  it("最初のページと検索条件をそのまま取得へ渡す", () => {
    observing();

    render(<ProductInfiniteList initial={INITIAL} query={QUERY} />);

    expect(useInfiniteProducts).toHaveBeenCalledWith(INITIAL, QUERY);
  });

  it("総数が分かれば全体の中の位置として件数を出す", () => {
    observing();

    render(<ProductInfiniteList initial={INITIAL} query={QUERY} total={48} />);

    expect(screen.getByText("全 48 件中 1 件を表示中")).toBeVisible();
  });

  it("総数が分からなければ読み込み済みの件数だけ出す", () => {
    observing();

    render(<ProductInfiniteList initial={INITIAL} query={QUERY} />);

    expect(screen.getByText("1 件を表示中")).toBeVisible();
  });

  it("取得中は読み込み中であることを伝える", () => {
    observing({ hasNext: true, loading: true });

    render(<ProductInfiniteList initial={INITIAL} query={QUERY} />);

    expect(screen.getByRole("status", { name: "続きを読み込んでいます" })).toBeVisible();
  });

  it("末尾を見張る目印へ観測先を渡す", () => {
    const sentinelRef = observing({ hasNext: true });

    render(<ProductInfiniteList initial={INITIAL} query={QUERY} />);

    expect(sentinelRef.current).toBeInstanceOf(HTMLDivElement);
  });

  it("取得に失敗したら読み直す操作を出す", () => {
    observing({ hasNext: true, failed: true });

    render(<ProductInfiniteList initial={INITIAL} query={QUERY} />);

    expect(screen.getByText("続きを読み込めませんでした。")).toBeVisible();
    expect(screen.getByRole("button", { name: "もう一度読み込む" })).toBeVisible();
  });

  it("読み直す操作は続きの取得を呼ぶ", async () => {
    const loadMore = vi.fn();

    observing({ hasNext: true, failed: true, loadMore });
    render(<ProductInfiniteList initial={INITIAL} query={QUERY} />);

    await userEvent.click(screen.getByRole("button", { name: "もう一度読み込む" }));

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it("a11y 違反を持たない", async () => {
    observing();

    const { container } = render(<ProductInfiniteList initial={INITIAL} query={QUERY} />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
