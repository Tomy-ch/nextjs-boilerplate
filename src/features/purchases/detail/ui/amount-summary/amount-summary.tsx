"use client";

import { useCallback, useId, useState } from "react";

import { Toggle } from "@/components/design-system/action/toggle/toggle";
import { Separator } from "@/components/design-system/display/separator/separator";
import {
  BASE_CURRENCY,
  formatMoney,
  formatReferenceAmount,
  type ReferenceAmount,
} from "@/model/money";
import type { Purchase } from "@/model/purchase/purchase";

const SHOW_REFERENCE_LABEL = "円で見る";

/** `PurchaseAmountSummary` の props。 */
export type PurchaseAmountSummaryProps = {
  /** 表示する購入。 */
  purchase: Purchase;
  /** 合計の参考換算額。読めなければ null。 */
  reference: ReferenceAmount | null;
};

/**
 * 請求額の内訳。
 *
 * @remarks
 * **確定した金額です。** 小計・税・送料・合計はいずれもバックエンドが決めた値で、画面は足し直し
 * ません（[0070](../../../../../docs/adr/0070-backend-role-separation.md)）。
 *
 * 参考換算額を添えるのは合計にだけです。内訳のそれぞれに添えると、どれが請求された金額なのかが
 * 読み取れなくなります。
 *
 * **基準通貨の金額は常に出したままにします。** 請求されたのはその金額であり、切り替えで置き換えると
 * どちらで請求されたのかが読み取れません。切り替えが足すのは参考の 1 行だけです。
 *
 * **参考換算額が無いときは切り替えも出しません。** 押しても何も現れない操作は、失敗したのか
 * 対応していないのかを利用者から区別できません。
 *
 * レートと基準日を添えるのは、いつの相場による目安かが判らなければ参考にならないためです。
 */
export function PurchaseAmountSummary({ purchase, reference }: PurchaseAmountSummaryProps) {
  const [shown, setShown] = useState(false);
  const referenceId = useId();
  const toggle = useCallback(() => setShown((current) => !current), []);
  const rows = [
    { label: "小計", amount: purchase.subtotalAmount },
    { label: "税", amount: purchase.taxAmount },
    { label: "送料", amount: purchase.shippingFee },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        {rows.map((row) => (
          <p className="flex items-baseline justify-between gap-2 text-sm" key={row.label}>
            <span className="text-muted-foreground">{row.label}</span>
            <span className="tabular-nums">{formatMoney(row.amount)}</span>
          </p>
        ))}
      </div>
      <Separator />
      <div className="flex flex-col gap-1">
        <p className="flex items-baseline justify-between gap-2">
          <span className="text-muted-foreground text-sm">合計</span>
          <strong className="text-2xl">{formatMoney(purchase.totalAmount)}</strong>
        </p>
        {reference === null ? null : (
          <div className="flex flex-col items-end gap-1 print-hidden">
            <Toggle
              aria-controls={referenceId}
              onClick={toggle}
              pressed={shown}
              size="sm"
              variant="outline"
            >
              {SHOW_REFERENCE_LABEL}
            </Toggle>
            <div className="flex flex-col items-end text-muted-foreground text-xs" id={referenceId}>
              {shown ? (
                <>
                  <span>{`約 ${formatReferenceAmount(reference)}（参考）`}</span>
                  <span>{`1 ${BASE_CURRENCY} = ${reference.rate} ${reference.currency}・基準日 ${reference.rateDate}`}</span>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
