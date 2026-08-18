import type { ReactNode } from "react";

import {
  FilterBar,
  FilterBarActiveFilters,
  FilterBarControls,
  FilterChip,
} from "@/components/patterns/filter-bar/filter-bar";

import { PURCHASE_HISTORY_PATH } from "../facade/paths/paths";
import { describePeriod, type PeriodSelection } from "./period";
import { PurchasePeriodFilter } from "./ui/period-filter/period-filter";

/** `PurchaseHistoryView` の props。 */
export type PurchaseHistoryViewProps = {
  /** いま効いている期間。 */
  period: PeriodSelection;
  /** 一覧本体。取得の仕方で差し替えられるよう外から受け取る。 */
  children: ReactNode;
};

/**
 * 購入履歴の画面。
 *
 * @remarks
 * 取得を持ちません。一覧本体を受け取る形にしてあるのは、画面の組み方の確認に取得を必要と
 * しないようにするためです。**同時に、期間が変わったときに取り直す範囲をここで区切っています。**
 * 絞り込みの操作はこの外側にあり、一覧が取り直されても待機表示に落ちません。
 *
 * 絞り込みを `FilterBar` にまとめます。landmark になるため、支援技術から絞り込みへ直接移動
 * できます。
 *
 * 効いている期間を chip で出すのは、入力欄が組み立て中の値を映すためです。入力欄をいじって
 * 確定していない間、画面に出ている一覧が何で絞られているかは入力欄からは読み取れません。
 *
 * パンくずは置きません。global nav がこの画面を直接指しており、階層が 1 段だからです
 * （[0026](../../../../docs/adr/0026-layout-shell-mount.md)）。
 */
export function PurchaseHistoryView({ period, children }: PurchaseHistoryViewProps) {
  const applied = describePeriod(period);

  return (
    <div className="flex flex-col gap-6">
      <FilterBar label="購入履歴の絞り込み">
        <FilterBarControls>
          <PurchasePeriodFilter period={period} />
        </FilterBarControls>
        {applied === null ? null : (
          <FilterBarActiveFilters>
            <FilterChip label="期間" removeHref={PURCHASE_HISTORY_PATH} value={applied} />
          </FilterBarActiveFilters>
        )}
      </FilterBar>
      {children}
    </div>
  );
}
