import type { ReactNode } from "react";

import type { FilterOption } from "./query";
import type { FilterGroup } from "./ui/filter-fields/filter-fields";
import { ProductFilterSheet } from "./ui/filter-sheet/filter-sheet";
import { ProductFilterSidebar } from "./ui/filter-sidebar/filter-sidebar";
import { ProductSearch } from "./ui/search/search";
import { ProductSortSelect } from "./ui/sort-select/sort-select";

/** `ProductListView` の props。 */
export type ProductListViewProps = {
  /** 絞り込みの群。 */
  groups: readonly FilterGroup[];
  /** 並び替えの選択肢。 */
  sortOptions: readonly FilterOption[];
  /** いま効いている条件。 */
  selection: Readonly<Record<string, string>>;
  /** 一覧本体。取得の仕方で差し替えられるよう外から受け取る。 */
  children: ReactNode;
};

/**
 * 商品一覧の画面。
 *
 * @remarks
 * 取得を持ちません。一覧本体を受け取る形にしてあるのは、画面の組み方の確認に取得を必要と
 * しないようにするためです。
 *
 * 絞り込みを 2 つ置き、CSS の段で出し分けます。位置が動く出し分けを JS の幅判定で行うと、
 * サーバでは判定できないため hydration の前後で配置が動きます
 * （[0051](../../../docs/adr/0051-styling-system.md) §2）。脇に常設できる幅の下限も、
 * 脇に領域を持てない幅で操作を下端へ固定する判断も、その ADR が持ちます。
 *
 * 並び替えを絞り込みの側へ入れず、幅によらず同じ場所へ置きます。単一選択なので選ぶことが確定と
 * 同じであり、まとめて確定する overlay の中に入れると確定の操作が 2 段になります。
 */
export function ProductListView({
  groups,
  sortOptions,
  selection,
  children,
}: ProductListViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <ProductSearch selection={selection} />
        <ProductSortSelect options={sortOptions} selection={selection} />
      </div>
      <div className="flex gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <ProductFilterSidebar groups={groups} selection={selection} />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <div className="lg:hidden">
        <ProductFilterSheet groups={groups} selection={selection} />
      </div>
    </div>
  );
}
