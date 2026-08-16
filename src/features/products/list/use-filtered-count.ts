"use client";

import { useEffect, useState } from "react";

import { fetchProductCount } from "@/adapters/client/api/products";

import { type ProductListSelection, toProductListSearchParams } from "../facade/list-url/list-url";

/** 滑らせる操作や連続した選択が止まったと見なすまでの待ち。 */
const SETTLE_MS = 300;

/** 条件に一致する件数と、その取得の状況。 */
export type FilteredCount = {
  /**
   * 一致する件数。
   *
   * @remarks
   * 数え直している間は 1 つ前の条件の件数が入ります。まだ一度も数えていなければ `undefined`
   * です。取得のたびに消すと、条件を選ぶたびに数が現れては消え、読み取る前に入れ替わります。
   */
  readonly count: number | undefined;
  /** いまの条件で数え終えていないか。 */
  readonly loading: boolean;
};

/**
 * まだ確定していない条件で、一致する件数を数える。
 *
 * @remarks
 * **確定する前に件数が分かることが、この画面で確定を明示にできる理由です。** 押してみるまで
 * 結果が分からないなら、選ぶたびに反映する形のほうが手数が少なくなります。
 *
 * 一覧に効いている条件と同じであっても数え直します。効いている条件ぶんの件数は一覧の側が
 * 持っていますが、それは条件が変わるたびに待機表示へ落ちる境界の内側にあり、絞り込みの側から
 * 参照すると、絞り込みまで一覧と一緒に待つことになります。
 *
 * 操作が止まってから取得します。滑らせる操作は 1 回の操作で条件を何度も変えるため、変わるたびに
 * 取りに行くと、捨てるための往復が並びます。前の取得は打ち切ります。
 *
 * @param conditions - 数える対象の条件
 */
export function useFilteredCount(conditions: ProductListSelection): FilteredCount {
  // 条件そのものではなく、条件を表す 1 つの文字列で見張る。条件は描画のたびに別の object に
  // なるため、そのまま見張ると毎回取り直しになる。
  const search = toProductListSearchParams(conditions).toString();
  const [found, setFound] = useState<{ search: string; count: number } | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchProductCount(new URLSearchParams(search), controller.signal)
        .then((count) => setFound({ search, count }))
        // 打ち切りも失敗も、件数が分からないことに変わりはない。数の代わりに何かを出すと、
        // それが件数として読まれる。
        .catch(() => undefined);
    }, SETTLE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  return { count: found?.count, loading: found?.search !== search };
}
