// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PRODUCT_LIST_MAX_ITEMS } from "@/adapters/client/api/products";
import type { CursorPage } from "@/model/pagination";
import type { ProductListItem } from "@/model/product/product";

const { fetchProductListPage } = vi.hoisted(() => ({ fetchProductListPage: vi.fn() }));

vi.mock("@/adapters/client/api/products", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/client/api/products")>()),
  fetchProductListPage,
}));

import { COUNT_KEY, CURSOR_KEY } from "./query";
import { useInfiniteProducts } from "./use-infinite-products";

type IntersectionCallback = (entries: readonly { isIntersecting: boolean }[]) => void;

type ObserverRecord = {
  callback: IntersectionCallback;
  targets: Element[];
};

const observers: ObserverRecord[] = [];

class IntersectionObserverStub {
  private readonly record: ObserverRecord;

  constructor(callback: IntersectionCallback) {
    this.record = { callback, targets: [] };
    observers.push(this.record);
  }

  observe(target: Element) {
    this.record.targets.push(target);
  }

  unobserve() {}

  disconnect() {}

  takeRecords() {
    return [];
  }
}

const NO_QUERY: Readonly<Record<string, string>> = {};

function itemOf(name: string): ProductListItem {
  return {
    id: name,
    name,
    price: "1980.00",
    quantity: 4,
    categoryName: "デスク周り",
    statusName: "公開中",
    imageUrl: null,
  };
}

function pageOf(
  names: readonly string[],
  nextCursor: string | null = null,
): CursorPage<ProductListItem> {
  return { items: names.map(itemOf), nextCursor };
}

function deferredPage() {
  let settle!: {
    resolve: (page: CursorPage<ProductListItem>) => void;
    reject: (reason: unknown) => void;
  };
  const promise = new Promise<CursorPage<ProductListItem>>((resolve, reject) => {
    settle = { resolve, reject };
  });

  return { promise, ...settle };
}

type ProbeProps = {
  initial: CursorPage<ProductListItem>;
  query?: Readonly<Record<string, string>>;
  sentinel?: boolean;
};

function Probe({ initial, query = NO_QUERY, sentinel = true }: ProbeProps) {
  const { items, hasNext, loading, failed, loadMore, sentinelRef } = useInfiniteProducts(
    initial,
    query,
  );

  return (
    <div>
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
      <p>{hasNext ? "続きあり" : "終端"}</p>
      <p>{loading ? "取得中" : "停止中"}</p>
      <p>{failed ? "失敗" : "変わりなし"}</p>
      <button onClick={loadMore} type="button">
        続きを読む
      </button>
      {sentinel ? <div data-testid="sentinel" ref={sentinelRef} /> : null}
    </div>
  );
}

function seeSentinel(isIntersecting: boolean): void {
  const observer = observers.at(-1);

  if (observer === undefined) {
    throw new Error("目印の観測が始まっていません");
  }

  act(() => observer.callback([{ isIntersecting }]));
}

function loadedCountInUrl(): string | null {
  return new URL(window.location.href).searchParams.get(COUNT_KEY);
}

async function clickLoadMore(): Promise<void> {
  await userEvent.click(screen.getByRole("button", { name: "続きを読む" }));
}

function signalOfLastFetch(): AbortSignal {
  const found: unknown = fetchProductListPage.mock.calls.at(-1)?.[1];

  if (!(found instanceof AbortSignal)) {
    throw new Error("取得へ打ち切りの手段が渡されていません");
  }

  return found;
}

describe("useInfiniteProducts", () => {
  beforeEach(() => {
    fetchProductListPage.mockReset();
    observers.length = 0;
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
    window.history.replaceState(null, "", "/products");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ----- 正常系 -----
  it("続きを読むと読み込み済みへ積み上げる", async () => {
    fetchProductListPage.mockResolvedValue(pageOf(["スタンドライト"]));
    render(<Probe initial={pageOf(["折りたたみ椅子"], "cursor-1")} />);

    await clickLoadMore();

    expect(screen.getByText("折りたたみ椅子")).toBeVisible();
    expect(screen.getByText("スタンドライト")).toBeVisible();
  });

  it("続きを読み終えたら次の位置を引き継ぐ", async () => {
    fetchProductListPage.mockResolvedValue(pageOf(["スタンドライト"], null));
    render(<Probe initial={pageOf(["折りたたみ椅子"], "cursor-1")} />);

    await clickLoadMore();

    expect(screen.getByText("終端")).toBeVisible();
    expect(screen.getByText("停止中")).toBeVisible();
  });

  it("いまの検索条件を続きの取得へ引き継ぐ", async () => {
    fetchProductListPage.mockResolvedValue(pageOf(["スタンドライト"]));
    render(<Probe initial={pageOf(["折りたたみ椅子"], "cursor-1")} query={{ keyword: "椅子" }} />);

    await clickLoadMore();

    expect(fetchProductListPage).toHaveBeenCalledWith(
      { keyword: "椅子", [CURSOR_KEY]: "cursor-1" },
      expect.any(AbortSignal),
    );
  });

  it("末尾の目印が見えたら続きを読む", async () => {
    fetchProductListPage.mockResolvedValue(pageOf(["スタンドライト"]));
    render(<Probe initial={pageOf(["折りたたみ椅子"], "cursor-1")} />);

    seeSentinel(true);

    expect(await screen.findByText("スタンドライト")).toBeVisible();
  });

  it("末尾の目印がまだ見えていなければ読まない", () => {
    render(<Probe initial={pageOf(["折りたたみ椅子"], "cursor-1")} />);

    seeSentinel(false);

    expect(fetchProductListPage).not.toHaveBeenCalled();
  });

  it("終端では末尾の目印を見張らない", () => {
    render(<Probe initial={pageOf(["折りたたみ椅子"], null)} />);

    expect(observers).toHaveLength(0);
  });

  it("目印が置かれていなければ見張らない", () => {
    render(<Probe initial={pageOf(["折りたたみ椅子"], "cursor-1")} sentinel={false} />);

    expect(observers).toHaveLength(0);
  });

  it("読み進めた件数を URL へ書き戻す", async () => {
    fetchProductListPage.mockResolvedValue(pageOf(["スタンドライト"]));
    render(<Probe initial={pageOf(["折りたたみ椅子"], "cursor-1")} />);
    expect(loadedCountInUrl()).toBe("1");

    await clickLoadMore();

    expect(loadedCountInUrl()).toBe("2");
    expect(window.location.pathname).toBe("/products");
  });

  it("上限を超えて読み込んでも URL へは上限までしか書かない", () => {
    const names = Array.from({ length: PRODUCT_LIST_MAX_ITEMS + 1 }, (_, index) => `商品 ${index}`);

    render(<Probe initial={pageOf(names, null)} />);

    expect(loadedCountInUrl()).toBe(String(PRODUCT_LIST_MAX_ITEMS));
  });

  // ----- 異常系 -----
  it("終端では続きを読まない", async () => {
    render(<Probe initial={pageOf(["折りたたみ椅子"], null)} />);

    await clickLoadMore();

    expect(fetchProductListPage).not.toHaveBeenCalled();
    expect(screen.getByText("停止中")).toBeVisible();
  });

  it("取得中は二重に読まない", async () => {
    const pending = deferredPage();

    fetchProductListPage.mockReturnValue(pending.promise);
    render(<Probe initial={pageOf(["折りたたみ椅子"], "cursor-1")} />);

    await clickLoadMore();
    await clickLoadMore();

    expect(fetchProductListPage).toHaveBeenCalledTimes(1);
    expect(screen.getByText("取得中")).toBeVisible();
  });

  it("取得に失敗したら失敗を伝え、読み込み済みは消さない", async () => {
    fetchProductListPage.mockRejectedValue(new Error("取得できません"));
    render(<Probe initial={pageOf(["折りたたみ椅子"], "cursor-1")} />);

    await clickLoadMore();

    expect(await screen.findByText("失敗")).toBeVisible();
    expect(screen.getByText("折りたたみ椅子")).toBeVisible();
    expect(screen.getByText("停止中")).toBeVisible();
  });

  it("読み直せば失敗の表示が消える", async () => {
    fetchProductListPage.mockRejectedValueOnce(new Error("取得できません"));
    fetchProductListPage.mockResolvedValueOnce(pageOf(["スタンドライト"]));
    render(<Probe initial={pageOf(["折りたたみ椅子"], "cursor-1")} />);
    await clickLoadMore();
    expect(await screen.findByText("失敗")).toBeVisible();

    await clickLoadMore();

    expect(await screen.findByText("スタンドライト")).toBeVisible();
    expect(screen.getByText("変わりなし")).toBeVisible();
  });

  it("画面を離れたら取得中の要求を打ち切る", async () => {
    const pending = deferredPage();

    fetchProductListPage.mockReturnValue(pending.promise);
    const view = render(<Probe initial={pageOf(["折りたたみ椅子"], "cursor-1")} />);
    await clickLoadMore();
    const signal = signalOfLastFetch();
    expect(signal.aborted).toBe(false);

    view.unmount();
    await act(async () => {
      pending.reject(new Error("打ち切りました"));
      await Promise.resolve();
    });

    expect(signal.aborted).toBe(true);
  });
});
