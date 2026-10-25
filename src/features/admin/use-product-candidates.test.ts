// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CursorPage } from "@/model/pagination";
import type { ProductListItem } from "@/model/product/product";
import { toProductId } from "@/model/product/product";

const { fetchProductListPage } = vi.hoisted(() => ({ fetchProductListPage: vi.fn() }));

vi.mock("@/adapters/client/api/products", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/client/api/products")>()),
  fetchProductListPage,
}));

import { PRODUCT_CANDIDATE_LIMIT, useProductCandidates } from "./use-product-candidates";

function itemOf(name: string): ProductListItem {
  return {
    id: toProductId(`id-${name}`),
    name,
    price: "19.99",
    quantity: 4,
    categoryName: "電子機器",
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
  let handles!: {
    resolve: (page: CursorPage<ProductListItem>) => void;
    reject: (reason: unknown) => void;
  };
  const promise = new Promise<CursorPage<ProductListItem>>((resolve, reject) => {
    handles = { resolve, reject };
  });

  return { promise, ...handles };
}

function renderCandidates(keyword: string) {
  return renderHook(({ keyword: typed }) => useProductCandidates(typed), {
    initialProps: { keyword },
  });
}

async function settle(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1_000);
  });
}

function signalOfLastFetch(): AbortSignal {
  const found: unknown = fetchProductListPage.mock.calls.at(-1)?.[1];

  if (!(found instanceof AbortSignal)) {
    throw new Error("取得へ打ち切りの手段が渡されていません");
  }

  return found;
}

function queryOfLastFetch(): string {
  const found: unknown = fetchProductListPage.mock.calls.at(-1)?.[0];

  if (!(found instanceof URLSearchParams)) {
    throw new Error("取得へ条件が渡されていません");
  }

  return found.toString();
}

beforeEach(() => {
  vi.useFakeTimers();
  fetchProductListPage.mockReset();
  fetchProductListPage.mockResolvedValue(pageOf(["ワイヤレスイヤホン"]));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useProductCandidates", () => {
  // ----- 語が空のとき -----
  it("語が空なら取りに行かず、待機の状況を返す", async () => {
    const { result } = renderCandidates("");

    await settle();

    expect(result.current).toEqual({ status: "idle" });
    expect(fetchProductListPage).not.toHaveBeenCalled();
  });

  it("空白だけの語も空として扱う", async () => {
    const { result } = renderCandidates("   ");

    await settle();

    expect(result.current).toEqual({ status: "idle" });
    expect(fetchProductListPage).not.toHaveBeenCalled();
  });

  it("候補を出した後に語を消せば、待機の状況へ戻る", async () => {
    const { result, rerender } = renderCandidates("イヤホン");
    await settle();

    rerender({ keyword: "" });

    expect(result.current).toEqual({ status: "idle" });
  });

  it("待っている間に語を消せば、取りに行かない", async () => {
    const { rerender } = renderCandidates("イヤホン");

    rerender({ keyword: "" });
    await settle();

    expect(fetchProductListPage).not.toHaveBeenCalled();
  });

  // ----- 取得中のとき -----
  it("語が打たれた時点では取りに行かず、取得中を返す", () => {
    const { result } = renderCandidates("イヤホン");

    expect(result.current).toEqual({ status: "loading" });
    expect(fetchProductListPage).not.toHaveBeenCalled();
  });

  it("打つ手が止まってから 1 度だけ取りに行く", async () => {
    renderCandidates("イヤホン");

    await settle();

    expect(fetchProductListPage).toHaveBeenCalledTimes(1);
  });

  it("前後の空白を落とした語で、未公開も含めて候補の数だけ取りに行く", async () => {
    renderCandidates("  イヤホン ");

    await settle();

    expect(queryOfLastFetch()).toBe(
      new URLSearchParams({
        keyword: "イヤホン",
        includeUnpublished: "true",
        first: String(PRODUCT_CANDIDATE_LIMIT),
      }).toString(),
    );
    expect(signalOfLastFetch().aborted).toBe(false);
  });

  it("打ち続けている間は、最後の語でだけ取りに行く", async () => {
    const { rerender } = renderCandidates("イヤ");

    rerender({ keyword: "イヤホン" });
    await settle();

    expect(fetchProductListPage).toHaveBeenCalledTimes(1);
    expect(queryOfLastFetch()).toContain(encodeURIComponent("イヤホン"));
  });

  it("語が変われば、前の語の取得を打ち切る", async () => {
    fetchProductListPage.mockReturnValue(deferredPage().promise);
    const { rerender } = renderCandidates("イヤホン");
    await settle();
    const previous = signalOfLastFetch();

    rerender({ keyword: "ケーブル" });

    expect(previous.aborted).toBe(true);
  });

  it("前の語の結果が届いても、今の語の結果が届くまでは取得中を返す", async () => {
    const earlier = deferredPage();
    const later = deferredPage();
    fetchProductListPage.mockReturnValueOnce(earlier.promise).mockReturnValueOnce(later.promise);
    const { result, rerender } = renderCandidates("イヤホン");
    await settle();
    rerender({ keyword: "ケーブル" });
    await settle();

    earlier.resolve(pageOf(["ワイヤレスイヤホン"]));
    await settle();

    expect(result.current).toEqual({ status: "loading" });

    later.resolve(pageOf(["充電ケーブル"]));
    await settle();

    expect(result.current).toEqual({
      status: "found",
      items: [{ id: toProductId("id-充電ケーブル"), name: "充電ケーブル" }],
      hasMore: false,
    });
  });

  it("末尾の空白だけが変わっても取り直さない", async () => {
    const { result, rerender } = renderCandidates("イヤホン");
    await settle();

    rerender({ keyword: "イヤホン " });
    await settle();

    expect(fetchProductListPage).toHaveBeenCalledTimes(1);
    expect(result.current).toMatchObject({ status: "found" });
  });

  it("画面を離れたら、走っている取得を打ち切る", async () => {
    fetchProductListPage.mockReturnValue(deferredPage().promise);
    const { unmount } = renderCandidates("イヤホン");
    await settle();
    const signal = signalOfLastFetch();

    unmount();

    expect(signal.aborted).toBe(true);
  });

  it("待っている間に画面を離れたら、取りに行かない", async () => {
    const { unmount } = renderCandidates("イヤホン");

    unmount();
    await settle();

    expect(fetchProductListPage).not.toHaveBeenCalled();
  });

  // ----- 見つかったとき -----
  it("候補を識別子と名前だけで返す", async () => {
    const { result } = renderCandidates("イヤホン");

    await settle();

    expect(result.current).toStrictEqual({
      status: "found",
      items: [{ id: toProductId("id-ワイヤレスイヤホン"), name: "ワイヤレスイヤホン" }],
      hasMore: false,
    });
  });

  it("続きがあれば、ほかにも一致する商品があると伝える", async () => {
    fetchProductListPage.mockResolvedValue(pageOf(["ワイヤレスイヤホン"], "cursor-1"));
    const { result } = renderCandidates("イヤホン");

    await settle();

    expect(result.current).toMatchObject({ status: "found", hasMore: true });
  });

  it("一致する商品が無ければ、空の候補を返す", async () => {
    fetchProductListPage.mockResolvedValue(pageOf([]));
    const { result } = renderCandidates("イヤホン");

    await settle();

    expect(result.current).toEqual({ status: "found", items: [], hasMore: false });
  });

  // ----- 取得できなかったとき -----
  it("取得に失敗すれば、取得できなかったと返す", async () => {
    fetchProductListPage.mockRejectedValue(new Error("取得できません"));
    const { result } = renderCandidates("イヤホン");

    await settle();

    expect(result.current).toEqual({ status: "unavailable" });
  });

  it("打ち切った取得の失敗は、取得できなかったとして記録しない", async () => {
    const aborted = deferredPage();
    fetchProductListPage
      .mockReturnValueOnce(aborted.promise)
      .mockReturnValue(deferredPage().promise);
    const { result, rerender } = renderCandidates("イヤホン");
    await settle();
    rerender({ keyword: "ケーブル" });

    aborted.reject(new DOMException("中断されました", "AbortError"));
    await settle();
    rerender({ keyword: "イヤホン" });

    expect(result.current).toEqual({ status: "loading" });
  });
});
