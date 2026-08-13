"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

import { fetchProductListPage, PRODUCT_LIST_MAX_ITEMS } from "@/adapters/client/api/products";
import { appendCursorPage, type CursorPage } from "@/model/pagination";
import type { ProductListItem } from "@/model/product/product";

import { COUNT_KEY, CURSOR_KEY } from "./query";

/** 末尾に近づいたと見なす距離。画面に入り切る前に読み始めて、待たせる時間を短くする。 */
const PREFETCH_MARGIN = "400px";

/** 読み進めた一覧の状態と、続きを読む手段。 */
export type InfiniteProducts = {
  /** 読み込み済みのすべての商品。 */
  readonly items: readonly ProductListItem[];
  /** まだ続きがあるか。 */
  readonly hasNext: boolean;
  /** 続きを取得している最中か。 */
  readonly loading: boolean;
  /** 直前の取得に失敗したか。 */
  readonly failed: boolean;
  /** 続きを読む。取得中と終端では何もしない。 */
  readonly loadMore: () => void;
  /** 一覧の末尾に置く目印。ここが見えたら続きを読む。 */
  readonly sentinelRef: RefObject<HTMLDivElement | null>;
};

/**
 * 一覧を読み進める。
 *
 * @remarks
 * `features` の中に置いています。末尾到達で続きを読む形は今のところこの一覧にしかなく、横断が
 * 生じた時点で `capabilities` へ上げます（[0073](../../../docs/adr/0073-pagination-fetch-boundary.md)）。
 * 使う場所が 1 つのうちからカーネルへ置くと、2 つめが現れたときに最初の 1 つの都合が既定に
 * なっています。
 *
 * 初回ページは受け取るだけで取得しません。取得するのは Server Component であり、この hook が
 * 担うのは 2 ページ目以降だけです。
 *
 * 読み進めた件数を URL へ書き戻します。書き戻さないと、戻る操作も再読み込みも先頭の 1 ページ
 * だけの画面に戻り、読み進めた分がスクロール位置ごと失われます。履歴を積まずに現在の項目を
 * 差し替えるので、戻る操作は一覧より前の画面へ抜けます。
 *
 * @param initial - Server Component が取得した最初のページ
 * @param query - いま効いている検索条件。続きの取得にそのまま渡す
 */
export function useInfiniteProducts(
  initial: CursorPage<ProductListItem>,
  query: Readonly<Record<string, string>>,
): InfiniteProducts {
  const [page, setPage] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadMore = useCallback(() => {
    const cursor = page.nextCursor;

    if (cursor === null || loading) {
      return;
    }

    const controller = new AbortController();

    abortRef.current = controller;
    setLoading(true);
    setFailed(false);

    fetchProductListPage({ ...query, [CURSOR_KEY]: cursor }, controller.signal)
      .then((next) => {
        setPage((loaded) => appendCursorPage(loaded, next));
        setLoading(false);
      })
      .catch(() => {
        // 打ち切りは失敗ではない。条件が変わったか画面を離れたかで、伝える相手がもういない。
        if (!controller.signal.aborted) {
          setFailed(true);
          setLoading(false);
        }
      });
  }, [loading, page.nextCursor, query]);

  const loadMoreRef = useRef(loadMore);

  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const target = sentinelRef.current;

    if (target === null || page.nextCursor === null) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMoreRef.current();
        }
      },
      { rootMargin: PREFETCH_MARGIN },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [page.nextCursor]);

  const loadedCount = page.items.length;

  useEffect(() => {
    const url = new URL(window.location.href);

    url.searchParams.set(COUNT_KEY, String(Math.min(loadedCount, PRODUCT_LIST_MAX_ITEMS)));
    window.history.replaceState(window.history.state, "", url);
  }, [loadedCount]);

  return {
    items: page.items,
    hasNext: page.nextCursor !== null,
    loading,
    failed,
    loadMore,
    sentinelRef,
  };
}
