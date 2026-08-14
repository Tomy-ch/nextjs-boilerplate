import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/design-system/action/button/button";
import { SearchFieldNative } from "@/components/design-system/form/search-field-native/search-field-native";
import {
  FilterBar,
  FilterBarActiveFilters,
  FilterBarControls,
  FilterChip,
} from "@/components/patterns/filter-bar/filter-bar";
import { FILTER_KEY, PRODUCT_LIST_PATH, toConditions } from "../facade/list-url/list-url";
import { toActiveFilters } from "./active-filters";
import type { FilterOption } from "./query";
import type { FilterGroup } from "./ui/filter-fields/filter-fields";
import { ProductFilterSheet } from "./ui/filter-sheet/filter-sheet";
import { ProductFilterSidebar } from "./ui/filter-sidebar/filter-sidebar";
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
 * 検索が引き継ぐ条件。
 *
 * @remarks
 * GET の form は送信時に URL の query をすべて捨てるため、絞り込みと並び替えを hidden で
 * 復元します。キーワードは入力欄そのものが持つので除きます。読み進めた位置は
 * {@link toConditions} が落とします。検索し直した後の「続き」は前の条件の続きだからです。
 */
function toCarriedParams(selection: Readonly<Record<string, string>>) {
  const { [FILTER_KEY.KEYWORD]: _keyword, ...carried } = toConditions(selection);

  return carried;
}

/**
 * 商品一覧の画面。
 *
 * @remarks
 * 取得を持ちません。一覧本体を受け取る形にしてあるのは、画面の組み方の確認に取得を必要と
 * しないようにするためです。
 *
 * 検索・並び替え・効いている条件を `FilterBar` にまとめます。landmark になるため、支援技術から
 * 絞り込みへ直接移動できます。効いている条件を chip で出すのは、脇の領域を持てない幅では入力欄が
 * overlay の中にあり、閉じている間は何で絞り込まれているかが画面から読めないためです。条件が
 * 増えるほどこの差は開きます。
 *
 * すべてを解除する操作は右端に留めます。chip の後ろへ流すと、条件が増えて折り返すたびに操作の
 * 位置が動き、同じ場所を狙って押せません。下端で揃えるのは、chip が複数行になったときに操作だけが
 * 上に浮かないようにするためです。
 *
 * 検索欄は hydration を必要としない形にしてあります。打鍵ごとに反映する必要が無く、送信結果は
 * URL に載るため、島にしても得るものがありません。
 *
 * 絞り込みの入力欄を 2 つ置き、CSS の段で出し分けます。位置が動く出し分けを JS の幅判定で行うと、
 * サーバでは判定できないため hydration の前後で配置が動きます
 * （[0051](../../../../docs/adr/0051-styling-system.md) §2）。脇に常設できる幅の下限も、
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
  const activeFilters = toActiveFilters(groups, selection);

  return (
    <div className="space-y-6">
      <FilterBar label="商品の検索と絞り込み">
        <FilterBarControls className="justify-between">
          <SearchFieldNative
            action={PRODUCT_LIST_PATH}
            className="max-w-xs flex-1"
            defaultValue={selection[FILTER_KEY.KEYWORD] ?? ""}
            hiddenParams={toCarriedParams(selection)}
            label="商品名で探す"
            name={FILTER_KEY.KEYWORD}
            placeholder="商品名で探す"
          />
          <ProductSortSelect options={sortOptions} selection={selection} />
        </FilterBarControls>
        <div className="flex items-end justify-between gap-4">
          <FilterBarActiveFilters className="min-w-0 flex-1">
            {activeFilters.map((filter) => (
              <FilterChip
                key={filter.key}
                label={filter.label}
                removeHref={filter.removeHref}
                value={filter.value}
              />
            ))}
          </FilterBarActiveFilters>
          {/* 1 件しか効いていないときは、その chip の解除と行き先が同じになる。 */}
          {activeFilters.length > 1 ? (
            <Button asChild className="shrink-0" size="sm" variant="ghost">
              <Link href={PRODUCT_LIST_PATH}>条件をすべて解除</Link>
            </Button>
          ) : null}
        </div>
      </FilterBar>
      <div className="flex gap-8">
        <aside aria-label="絞り込み条件" className="hidden w-64 shrink-0 lg:block">
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
