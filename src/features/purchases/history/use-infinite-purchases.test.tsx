// @vitest-environment jsdom

import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CursorPage } from "@/model/pagination";
import type { PurchaseHistoryEntry } from "@/model/purchase/purchase";

const { fetchPurchaseHistoryPage } = vi.hoisted(() => ({
  fetchPurchaseHistoryPage:
    vi.fn<(query: URLSearchParams, signal?: AbortSignal) => Promise<unknown>>(),
}));

vi.mock("@/adapters/client/api/purchases", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/client/api/purchases")>()),
  fetchPurchaseHistoryPage,
}));

import type { PeriodSelection } from "./period";
import { useInfinitePurchases } from "./use-infinite-purchases";

type IntersectionCallback = (entries: readonly { isIntersecting: boolean }[]) => void;

const observers: { callback: IntersectionCallback }[] = [];

class IntersectionObserverStub {
  private readonly record: { callback: IntersectionCallback };

  constructor(callback: IntersectionCallback) {
    this.record = { callback };
    observers.push(this.record);
  }

  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

/** 末尾が見えたことにする。 */
function reachEnd(): void {
  act(() => {
    observers.at(-1)?.callback([{ isIntersecting: true }]);
  });
}

function entryOf(code: string): PurchaseHistoryEntry {
  return { code, totalAmount: 1_000, statusName: "未処理", orderedAt: new Date("2026-08-17") };
}

function pageOf(
  codes: readonly string[],
  nextCursor: string | null = null,
): CursorPage<PurchaseHistoryEntry> {
  return { items: codes.map(entryOf), nextCursor };
}

const PAGE_SIZE = 20;
const ALL: PeriodSelection = { kind: "all" };

function Subject({
  initial,
  period = ALL,
}: {
  initial: CursorPage<PurchaseHistoryEntry>;
  period?: PeriodSelection;
}) {
  const { items, loadMore, sentinelRef } = useInfinitePurchases(initial, period, PAGE_SIZE);

  return (
    <>
      <span data-testid="codes">{items.map((item) => item.code).join(",")}</span>
      <span data-testid="status">{loadMore.status}</span>
      {loadMore.status === "failed" ? (
        <button onClick={loadMore.onRetry} type="button">
          読み直す
        </button>
      ) : null}
      <div data-testid="sentinel" ref={sentinelRef} />
    </>
  );
}

beforeEach(() => {
  observers.length = 0;
  fetchPurchaseHistoryPage.mockReset();
  vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useInfinitePurchases", () => {
  // ----- 正常系 -----
  it("最初のページを取得せずにそのまま出す", () => {
    render(<Subject initial={pageOf(["a", "b"])} />);

    expect(screen.getByTestId("codes")).toHaveTextContent("a,b");
    expect(fetchPurchaseHistoryPage).not.toHaveBeenCalled();
  });

  it("続きが無ければ読み終えたことを伝える", () => {
    render(<Subject initial={pageOf(["a"])} />);

    expect(screen.getByTestId("status")).toHaveTextContent("exhausted");
  });

  it("末尾へ近づくと続きを継ぎ足す", async () => {
    fetchPurchaseHistoryPage.mockResolvedValue(pageOf(["c"], null));

    render(<Subject initial={pageOf(["a", "b"], "cursor-1")} />);
    reachEnd();

    await waitFor(() => expect(screen.getByTestId("codes")).toHaveTextContent("a,b,c"));
    expect(screen.getByTestId("status")).toHaveTextContent("exhausted");
  });

  it("続きの取得へ、効いている期間と件数と鍵を渡す", async () => {
    fetchPurchaseHistoryPage.mockResolvedValue(pageOf(["c"]));

    render(<Subject initial={pageOf(["a"], "cursor-1")} period={{ kind: "recent", days: 30 }} />);
    reachEnd();

    await waitFor(() => expect(fetchPurchaseHistoryPage).toHaveBeenCalled());

    const params = fetchPurchaseHistoryPage.mock.calls[0]?.[0];

    expect(params?.get("period")).toBe("recent");
    expect(params?.get("days")).toBe("30");
    expect(params?.get("first")).toBe(String(PAGE_SIZE));
    expect(params?.get("after")).toBe("cursor-1");
  });

  it("内容が同じまま作り直された最初のページで、積み上げを捨てない", async () => {
    fetchPurchaseHistoryPage.mockResolvedValue(pageOf(["b"], null));

    const { rerender } = render(<Subject initial={pageOf(["a"], "cursor-1")} />);

    reachEnd();
    await waitFor(() => expect(screen.getByTestId("codes")).toHaveTextContent("a,b"));

    // サーバが同じ結果を返し直すと、中身は同じでも別のオブジェクトで届く。
    rerender(<Subject initial={pageOf(["a"], "cursor-1")} />);

    expect(screen.getByTestId("codes")).toHaveTextContent("a,b");
  });

  // ----- 異常系 -----
  it("取得に失敗したら、読み終えた分を残したまま読み直させる", async () => {
    fetchPurchaseHistoryPage.mockRejectedValue(new Error("失敗"));

    render(<Subject initial={pageOf(["a"], "cursor-1")} />);
    reachEnd();

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("failed"));
    expect(screen.getByTestId("codes")).toHaveTextContent("a");
  });

  it("読み直すと、同じ鍵で取り直す", async () => {
    fetchPurchaseHistoryPage.mockRejectedValueOnce(new Error("失敗"));

    render(<Subject initial={pageOf(["a"], "cursor-1")} />);
    reachEnd();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("failed"));

    fetchPurchaseHistoryPage.mockResolvedValue(pageOf(["b"], null));
    screen.getByRole("button", { name: "読み直す" }).click();

    await waitFor(() => expect(screen.getByTestId("codes")).toHaveTextContent("a,b"));
  });

  it("画面を離れたあとの失敗は、失敗として扱わない", async () => {
    let reject!: (reason: unknown) => void;

    fetchPurchaseHistoryPage.mockReturnValue(
      new Promise((_, rejectPage) => {
        reject = rejectPage;
      }),
    );

    const { unmount } = render(<Subject initial={pageOf(["a"], "cursor-1")} />);

    reachEnd();
    await waitFor(() => expect(fetchPurchaseHistoryPage).toHaveBeenCalled());

    const signal = fetchPurchaseHistoryPage.mock.calls[0]?.[1];

    unmount();

    expect(signal?.aborted).toBe(true);

    reject(new Error("打ち切り"));

    await expect(Promise.resolve().then(() => undefined)).resolves.toBeUndefined();
  });

  it("取得の最中に重ねて取りに行かない", async () => {
    fetchPurchaseHistoryPage.mockReturnValue(new Promise(() => undefined));

    render(<Subject initial={pageOf(["a"], "cursor-1")} />);
    reachEnd();
    reachEnd();

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("loading"));
    expect(fetchPurchaseHistoryPage).toHaveBeenCalledOnce();
  });
});
