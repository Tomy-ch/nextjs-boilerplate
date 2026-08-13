"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

import { FilterBar } from "@/components/patterns/filter-bar/filter-bar";

import { toProductListHref } from "../../query";
import { type FilterGroup, ProductFilterFields } from "../filter-fields/filter-fields";

/** `ProductFilterSidebar` の props。 */
export type ProductFilterSidebarProps = {
  /** 並べる絞り込みの群。 */
  groups: readonly FilterGroup[];
  /** いま効いている条件。 */
  selection: Readonly<Record<string, string>>;
};

/**
 * 脇に常設する絞り込み。選ぶたびに一覧へ反映する。
 *
 * @remarks
 * 確定の操作を持ちません。結果が同じ画面の中に見えている配置では、選んだ内容がそのまま結果に
 * 出るのが分かりやすく、確定を挟むと「選んだのに変わらない」状態が生まれます。結果が見えない
 * overlay 側は逆にまとめて確定します。
 *
 * 出す幅の判断は持ちません。脇の領域を出す下限は
 * [0051](../../../../../docs/adr/0051-styling-system.md) §2 が決めており、置く側が担います。
 *
 * 遷移を `useTransition` で包むのは、取得が終わるまで前の一覧を残すためです。包まないと選んだ
 * 瞬間に一覧が待機表示へ落ち、続けて絞り込む操作の足場が消えます。
 */
export function ProductFilterSidebar({ groups, selection }: ProductFilterSidebarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const select = useCallback(
    (key: string, value: string) => {
      startTransition(() => {
        router.push(toProductListHref({ ...selection, [key]: value }));
      });
    },
    [router, selection],
  );

  return (
    <FilterBar aria-busy={pending} label="絞り込み">
      <ProductFilterFields groups={groups} onSelect={select} selection={selection} />
    </FilterBar>
  );
}
