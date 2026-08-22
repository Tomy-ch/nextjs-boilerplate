// @vitest-environment jsdom

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PRODUCT_LIST_MAX_ITEMS } from "@/adapters/client/api/products";
import type { CursorPage } from "@/model/pagination";
import type { ProductListItem } from "@/model/product/product";
import { toProductId } from "@/model/product/product";

const { fetchProductListPage } = vi.hoisted(() => ({ fetchProductListPage: vi.fn() }));

vi.mock("@/adapters/client/api/products", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/client/api/products")>()),
  fetchProductListPage,
}));

import type { ProductListSelection } from "../facade/list-url/list-url";
import { COUNT_KEY, CURSOR_KEY } from "../facade/list-url/list-url";
import { PRODUCT_PAGE_SIZE } from "./page-size";
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
    id: toProductId(name),
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
  query?: ProductListSelection;
  sentinel?: boolean;
};

function Probe({ initial, query = NO_QUERY, sentinel = true }: ProbeProps) {
  const { items, loadMore, sentinelRef } = useInfiniteProducts(initial, query);

  return (
    <div>
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
      <p>{loadMore.status}</p>
      {loadMore.status === "failed" ? (
        <button onClick={loadMore.onRetry} type="button">
          読み直す
        </button>
      ) : null}
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

async function clickRetry(): Promise<void> {
  await userEvent.click(screen.getByRole("button", { name: "読み直す" }));
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

  it("続きを読むと読み込み済みへ積み上げる", async () => {
    fetchProductListPage.mockResolvedValue(pageOf(["スタンドライト"]));
    render(<Probe initial={pageOf(["折りたたみ椅子"], "cursor-1")} />);

    seeSentinel(true);

    expect(await screen.findByText("スタンドライト")).toBeVisible();
    expect(screen.getByText("折りたたみ椅子")).toBeVisible();
  });

  it("続きを読み終えたら読み終えた姿になる", async () => {
    fetchProductListPage.mockResolvedValue(pageOf(["スタンドライト"], null));
    render(<Probe initial={pageOf(["折りたたみ椅子"], "cursor-1")} />);

    seeSentinel(true);

    expect(await screen.findByText("exhausted")).toBeVisible();
  });

  it("いまの検索条件を続きの取得へ引き継ぐ", async () => {
    fetchProductListPage.mockResolvedValue(pageOf(["スタンドライト"]));
    render(<Probe initial={pageOf(["折りたたみ椅子"], "cursor-1")} query={{ keyword: "椅子" }} />);

    seeSentinel(true);
    await screen.findByText("スタンドライト");

    expect(fetchProductListPage.mock.calls[0]?.[0].toString()).toBe(
      new URLSearchParams({
        keyword: "椅子",
        [COUNT_KEY]: String(PRODUCT_PAGE_SIZE),
        [CURSOR_KEY]: "cursor-1",
      }).toString(),
    );
    expect(fetchProductListPage).toHaveBeenCalledWith(
      expect.any(URLSearchParams),
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

    seeSentinel(true);
    await screen.findByText("スタンドライト");

    await waitFor(() => expect(loadedCountInUrl()).toBe("2"));
    expect(window.location.pathname).toBe("/products");
  });

  it("上限を超えて読み込んでも URL へは上限までしか書かない", () => {
    const names = Array.from({ length: PRODUCT_LIST_MAX_ITEMS + 1 }, (_, index) => `商品 ${index}`);

    render(<Probe initial={pageOf(names, null)} />);

    expect(loadedCountInUrl()).toBe(String(PRODUCT_LIST_MAX_ITEMS));
  });

  it("読み終えた後に目印が見えても読まない", async () => {
    fetchProductListPage.mockResolvedValue(pageOf(["スタンドライト"], null));
    render(<Probe initial={pageOf(["折りたたみ椅子"], "cursor-1")} />);
    seeSentinel(true);
    await screen.findByText("exhausted");

    seeSentinel(true);

    expect(fetchProductListPage).toHaveBeenCalledTimes(1);
  });

  it("取得中は二重に読まない", () => {
    const pending = deferredPage();

    fetchProductListPage.mockReturnValue(pending.promise);
    render(<Probe initial={pageOf(["折りたたみ椅子"], "cursor-1")} />);

    seeSentinel(true);
    seeSentinel(true);

    expect(fetchProductListPage).toHaveBeenCalledTimes(1);
    expect(screen.getByText("loading")).toBeVisible();
  });

  it("取得に失敗したら失敗を伝え、読み込み済みは消さない", async () => {
    fetchProductListPage.mockRejectedValue(new Error("取得できません"));
    render(<Probe initial={pageOf(["折りたたみ椅子"], "cursor-1")} />);

    seeSentinel(true);

    expect(await screen.findByText("failed")).toBeVisible();
    expect(screen.getByText("折りたたみ椅子")).toBeVisible();
  });

  it("失敗したときだけ読み直す手段を渡す", async () => {
    fetchProductListPage.mockRejectedValue(new Error("取得できません"));
    render(<Probe initial={pageOf(["折りたたみ椅子"], "cursor-1")} />);
    expect(screen.queryByRole("button", { name: "読み直す" })).not.toBeInTheDocument();

    seeSentinel(true);

    expect(await screen.findByRole("button", { name: "読み直す" })).toBeVisible();
  });

  it("読み直せば失敗の表示が消える", async () => {
    fetchProductListPage.mockRejectedValueOnce(new Error("取得できません"));
    fetchProductListPage.mockResolvedValueOnce(pageOf(["スタンドライト"], "cursor-2"));
    render(<Probe initial={pageOf(["折りたたみ椅子"], "cursor-1")} />);
    seeSentinel(true);
    await screen.findByText("failed");

    await clickRetry();

    expect(await screen.findByText("スタンドライト")).toBeVisible();
    expect(screen.getByText("idle")).toBeVisible();
  });

  it("画面を離れたら取得中の要求を打ち切る", async () => {
    const pending = deferredPage();

    fetchProductListPage.mockReturnValue(pending.promise);
    const view = render(<Probe initial={pageOf(["折りたたみ椅子"], "cursor-1")} />);
    seeSentinel(true);
    const signal = signalOfLastFetch();
    expect(signal.aborted).toBe(false);

    view.unmount();
    await act(async () => {
      pending.reject(new Error("打ち切りました"));
      await Promise.resolve();
    });

    expect(signal.aborted).toBe(true);
  });

  it("複数選んだ分類を、続きの取得へ同じキーの繰り返しで引き継ぐ", async () => {
    fetchProductListPage.mockResolvedValue(pageOf(["スタンドライト"]));
    render(
      <Probe
        initial={pageOf(["折りたたみ椅子"], "cursor-1")}
        query={{ categoryCodes: ["10", "20"] }}
      />,
    );

    seeSentinel(true);
    await screen.findByText("スタンドライト");

    expect(fetchProductListPage.mock.calls[0]?.[0].getAll("categoryCodes")).toEqual(["10", "20"]);
  });
});
