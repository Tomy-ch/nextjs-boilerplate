"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

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

import { toProductListHref } from "../../../facade/list-url/list-url";
import { type FilterGroup, ProductFilterFields } from "../filter-fields/filter-fields";

/** `ProductFilterSheet` の props。 */
export type ProductFilterSheetProps = {
  /** 並べる絞り込みの群。 */
  groups: readonly FilterGroup[];
  /** いま効いている条件。 */
  selection: Readonly<Record<string, string>>;
};

/** いま効いている条件の数。「すべて」は数えない。 */
function countActive(
  groups: readonly FilterGroup[],
  selection: Readonly<Record<string, string>>,
): number {
  return groups.filter((group) => (selection[group.key] ?? "") !== "").length;
}

/**
 * 脇に領域を持てない幅での絞り込み。overlay の中で条件を組み、まとめて確定する。
 *
 * @remarks
 * 選ぶたびに反映しないのは、overlay が一覧を覆っていて結果が見えないためです。見えない相手を
 * 1 つずつ変えても手応えが返らず、変えた数だけ取得が走ります。脇に常設できる幅では逆に、結果が
 * 見えているので選ぶたびに反映します。
 *
 * 確定の文言に件数を出しません。契約が総件数を返さないため、出せるのは読み込み済みの件数だけで、
 * それを確定前に出すと「絞り込んだ結果の件数」と読めてしまいます。
 *
 * 開くたびに下書きを URL の状態へ戻します。閉じたときの中途半端な選択が次に開いたとき残っていると、
 * 表示されている一覧と入力欄の内容が食い違います。
 *
 * 開く操作を画面下端に固定するのは、一覧を読み進めた先でも絞り込みへ戻れるようにするためです
 * （[0051](../../../../../../docs/adr/0051-styling-system.md) §2）。
 */
export function ProductFilterSheet({ groups, selection }: ProductFilterSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(selection);
  const [, startTransition] = useTransition();

  const changeOpen = useCallback(
    (next: boolean) => {
      if (next) {
        setDraft(selection);
      }

      setOpen(next);
    },
    [selection],
  );

  const select = useCallback((key: string, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  }, []);

  const apply = useCallback(() => {
    setOpen(false);
    startTransition(() => {
      router.push(toProductListHref({ ...selection, ...draft }));
    });
  }, [draft, router, selection]);

  const clear = useCallback(() => {
    setDraft((current) => {
      const cleared = { ...current };

      for (const group of groups) {
        cleared[group.key] = "";
      }

      return cleared;
    });
  }, [groups]);

  return (
    <Sheet onOpenChange={changeOpen} open={open}>
      <ActionBar position={ACTION_BAR_POSITION.FIXED}>
        <SheetTrigger asChild>
          <FilterBarTrigger className="w-full" count={countActive(groups, selection)} />
        </SheetTrigger>
      </ActionBar>
      <SheetContent className="flex flex-col" side="bottom">
        <SheetHeader>
          <SheetTitle>絞り込み</SheetTitle>
          <SheetDescription>条件を選んでから、下の操作で一覧に反映します。</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          <ProductFilterFields groups={groups} onSelect={select} selection={draft} />
        </div>
        <SheetFooter>
          <Button onClick={apply} type="button">
            この条件で見る
          </Button>
          <Button onClick={clear} type="button" variant="outline">
            条件をすべて外す
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
