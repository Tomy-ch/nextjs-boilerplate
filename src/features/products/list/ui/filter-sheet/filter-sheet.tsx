"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/design-system/action/button/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/design-system/overlay/sheet/sheet";
import { ActionBar } from "@/components/patterns/action-bar/action-bar";
import { ACTION_BAR_POSITION } from "@/components/patterns/action-bar/action-bar.definition";
import { FilterBarTrigger } from "@/components/patterns/filter-bar/filter-bar";

import {
  FILTER_KEY,
  type ProductListSelection,
  toSelectedValues,
} from "../../../facade/list-url/list-url";
import { PRICE_RANGE_MAX, PRICE_RANGE_MIN, toPriceRange } from "../../price-range";
import type { FilterOption } from "../../query";
import { STOCK_AVAILABILITY, toStockAvailability } from "../../stock-availability";
import { useFilterDraft } from "../../use-filter-draft";
import { useFilteredCount } from "../../use-filtered-count";
import { ProductFilterFields } from "../filter-fields/filter-fields";

/** `ProductFilterSheet` の props。 */
export type ProductFilterSheetProps = {
  /** 選べる分類。 */
  categories: readonly FilterOption[];
  /** いま効いている条件。 */
  selection: ProductListSelection;
};

/** いま効いている条件の数。入力欄 1 つを 1 件と数え、指定なしは数えない。 */
function countActive(selection: ProductListSelection): number {
  const [low, high] = toPriceRange(selection);

  return [
    low !== PRICE_RANGE_MIN || high !== PRICE_RANGE_MAX,
    toSelectedValues(selection, FILTER_KEY.CATEGORY).length > 0,
    toStockAvailability(selection) !== STOCK_AVAILABILITY.ALL,
  ].filter(Boolean).length;
}

/**
 * 脇に領域を持てない幅での絞り込み。overlay の中で条件を組み、まとめて確定する。
 *
 * @remarks
 * 確定の仕方は脇に常設する側と同じです。**違うのは、条件を組んでいる間に一覧が見えないこと
 * だけ**なので、確定の操作を overlay の下端へ置き、開いている間の件数もそこへ出します。
 *
 * 開くたびに下書きを一覧の状態へ戻します。閉じたときの中途半端な選択が次に開いたとき残っていると、
 * 表示されている一覧と入力欄の内容が食い違います。
 *
 * 開く操作を画面下端に固定するのは、一覧を読み進めた先でも絞り込みへ戻れるようにするためです
 * （[0051](../../../../../../docs/adr/0051-styling-system.md) §2）。
 */
export function ProductFilterSheet({ categories, selection }: ProductFilterSheetProps) {
  const [open, setOpen] = useState(false);
  const { draft, change, clear, apply } = useFilterDraft(selection);
  const { count } = useFilteredCount(draft);

  const changeOpen = useCallback(
    (next: boolean) => {
      if (next) {
        change(selection);
      }

      setOpen(next);
    },
    [change, selection],
  );

  const confirm = useCallback(() => {
    setOpen(false);
    apply();
  }, [apply]);

  return (
    <Sheet onOpenChange={changeOpen} open={open}>
      <ActionBar position={ACTION_BAR_POSITION.FIXED}>
        <SheetTrigger asChild>
          <FilterBarTrigger className="w-full" count={countActive(selection)} />
        </SheetTrigger>
      </ActionBar>
      <SheetContent className="flex flex-col" side="bottom">
        <SheetHeader>
          <SheetTitle>絞り込み</SheetTitle>
          <SheetDescription>条件を選んでから、下の操作で一覧に反映します。</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          <ProductFilterFields categories={categories} draft={draft} onChange={change} />
        </div>
        <SheetFooter>
          <Button onClick={confirm} type="button">
            {count === undefined ? "この条件で見る" : `この条件で見る（該当件数 ${count} 件）`}
          </Button>
          <Button onClick={clear} type="button" variant="outline">
            条件をすべて外す
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
