"use client";

import { type SyntheticEvent, useCallback } from "react";

import { Button } from "@/components/design-system/action/button/button";

import { usePurchaseFilterDraft } from "../../filter-draft";
import { describeMissing } from "../../period-draft";
import { PurchasePeriodFields } from "../period-fields/period-fields";

/**
 * 帯の中に常設する期間の絞り込み。
 *
 * @remarks
 * 一覧が隣に見えている幅で使います。入力欄は {@link PurchasePeriodFields} が持ち、下書きは画面で
 * 1 つのものを読みます（`filter-draft.tsx`）。
 *
 * **確定の操作を置きます。** 商品一覧の脇の絞り込みが選んだ時点で反映するのは、1 回の操作で条件が
 * 1 つ決まるからです。ここは違い、期間の指定は開始日と終了日の 2 つが揃って初めて条件になります。
 *
 * 足りていない間は確定を押せなくし、何が足りないかをその場に出します。押せてしまうと、押した
 * 結果が一覧の消えた画面（契約は 400 を返す）になり、原因が利用者から見えません。
 *
 * **反映を待っている間も入力欄を押せるままにします。** 待っている間を塞ぐと、条件を続けて選ぶ
 * 操作がそのたびに止まります。代わりに支援技術へは `aria-busy` で伝えます。
 *
 * 出す幅の判断は持ちません。この帯を出す下限は
 * [0051](../../../../../../docs/adr/0051-styling-system.md) §2 が決めており、置く側が担います。
 */
export function PurchasePeriodBar() {
  const { draft, applied, pending, change, apply } = usePurchaseFilterDraft();
  const missing = describeMissing(draft);

  const submit = useCallback(
    (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault();
      apply();
    },
    [apply],
  );

  return (
    <form aria-busy={pending} className="flex flex-wrap items-end gap-3" onSubmit={submit}>
      <PurchasePeriodFields draft={draft} onChange={change} />
      <Button disabled={applied === null} type="submit">
        絞り込む
      </Button>
      {missing === null ? null : (
        <p className="basis-full text-muted-foreground text-sm">{missing}</p>
      )}
    </form>
  );
}
