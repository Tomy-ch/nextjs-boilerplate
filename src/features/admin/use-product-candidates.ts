"use client";

import { useEffect, useState } from "react";

import { fetchProductListPage } from "@/adapters/client/api/products";
import type { ProductListItem } from "@/model/product/product";

/** 打つ手が止まったと見なすまでの待ち。 */
const SETTLE_MS = 300;

/** 1 度の検索で並べる候補の数。 */
export const PRODUCT_CANDIDATE_LIMIT = 20;

/** 商品の候補の取得の状況。 */
export type ProductCandidates =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "unavailable" }
  | {
      readonly status: "found";
      readonly items: readonly Pick<ProductListItem, "id" | "name">[];
      /** 並べた候補のほかにも一致する商品があるか。 */
      readonly hasMore: boolean;
    };

/**
 * 商品名で候補を探す。
 *
 * @remarks
 * **未公開・廃番の商品も候補に含めます。** クーポンの範囲として指せるかを決めるのは契約で、
 * 契約はそれを拒んでいません。画面が候補から外すと、指せるはずの商品が選べなくなります。
 *
 * 打つ手が止まってから取得し、前の取得は打ち切ります。打ち切りは失敗として数えません — 語が
 * 既に変わっており、記録すると今の語の結果として読まれます。
 *
 * 語が空のあいだは取りに行きません。全件の先頭を並べても、探している商品である見込みが無い
 * ためです。
 *
 * @param keyword - 打たれている商品名
 * @returns 候補の取得の状況
 */
export function useProductCandidates(keyword: string): ProductCandidates {
  const trimmed = keyword.trim();
  const [found, setFound] = useState<{ keyword: string; result: ProductCandidates } | undefined>(
    undefined,
  );

  useEffect(() => {
    if (trimmed === "") {
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      const query = new URLSearchParams({
        keyword: trimmed,
        includeUnpublished: "true",
        first: String(PRODUCT_CANDIDATE_LIMIT),
      });

      fetchProductListPage(query, controller.signal)
        .then((page) =>
          setFound({
            keyword: trimmed,
            result: {
              status: "found",
              items: page.items.map(({ id, name }) => ({ id, name })),
              hasMore: page.nextCursor !== null,
            },
          }),
        )
        .catch(() => {
          if (!controller.signal.aborted) {
            setFound({ keyword: trimmed, result: { status: "unavailable" } });
          }
        });
    }, SETTLE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  if (trimmed === "") {
    return { status: "idle" };
  }

  return found?.keyword === trimmed ? found.result : { status: "loading" };
}
