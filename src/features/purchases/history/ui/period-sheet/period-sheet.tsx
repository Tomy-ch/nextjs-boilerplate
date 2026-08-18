"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/design-system/action/button/button";
import { BUTTON_VARIANT } from "@/components/design-system/action/button/button.definition";
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

import { usePurchaseFilterDraft } from "../../filter-draft";
import type { PeriodSelection } from "../../period";
import { describeMissing } from "../../period-draft";
import { PurchasePeriodFields } from "../period-fields/period-fields";

/** `PurchasePeriodSheet` の props。 */
export type PurchasePeriodSheetProps = {
  /** いま一覧に効いている期間。効いている数を操作へ出すために受け取る。 */
  period: PeriodSelection;
};

/**
 * 帯を常設できない幅での期間の絞り込み。overlay の中で期間を組み、まとめて確定する。
 *
 * @remarks
 * **開く操作を画面下端に固定します。** 一覧を読み進めた先でも絞り込みへ戻れるようにするためで、
 * 上端に置くと、古い購入を探して読み進めるほど条件を変える手段が遠ざかります
 * （[0051](../../../../../../docs/adr/0051-styling-system.md) §2）。
 *
 * **期間を組んでいる間、一覧は overlay の裏に隠れます。** 選んだ結果が見えないので、確定の操作を
 * overlay の下端へ置きます。
 *
 * **開くときに下書きを捨てません。** 下書きは画面で 1 つで、一覧に効いている期間が変われば
 * そちらへ揃います。ここで戻すと、閉じる前に組みかけていた期間が消えます。
 *
 * 効いている条件の数を操作の中に出すのは、閉じている入力欄の中身が見えないためです。期間は
 * 1 つだけなので数は 0 か 1 で、何で絞られているかは帯の chip が示します。
 */
export function PurchasePeriodSheet({ period }: PurchasePeriodSheetProps) {
  const [open, setOpen] = useState(false);
  const { draft, applied, change, apply, reset } = usePurchaseFilterDraft();
  const missing = describeMissing(draft);

  const confirm = useCallback(() => {
    setOpen(false);
    apply();
  }, [apply]);

  const clear = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset]);

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <ActionBar position={ACTION_BAR_POSITION.FIXED}>
        <SheetTrigger asChild>
          <FilterBarTrigger className="w-full" count={period.kind === "all" ? 0 : 1}>
            期間で絞り込む
          </FilterBarTrigger>
        </SheetTrigger>
      </ActionBar>
      <SheetContent className="flex flex-col" side="bottom">
        <SheetHeader>
          <SheetTitle>期間で絞り込む</SheetTitle>
          <SheetDescription>期間を選んでから、下の操作で一覧に反映します。</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          <PurchasePeriodFields draft={draft} onChange={change} />
          {missing === null ? null : (
            <p className="pt-3 text-muted-foreground text-sm">{missing}</p>
          )}
        </div>
        <SheetFooter>
          <Button disabled={applied === null} onClick={confirm} type="button">
            この期間で見る
          </Button>
          <Button
            disabled={period.kind === "all" && draft.kind === "all"}
            onClick={clear}
            type="button"
            variant={BUTTON_VARIANT.OUTLINE}
          >
            全期間に戻す
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
