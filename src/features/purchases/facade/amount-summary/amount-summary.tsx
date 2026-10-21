import type { ReactNode } from "react";

import { AmountWithReference } from "@/components/design-system/display/amount-with-reference/amount-with-reference";
import { Separator } from "@/components/design-system/display/separator/separator";
import { formatMoney, type ReferenceAmount } from "@/model/money";
import type { Purchase } from "@/model/purchase/purchase";

/** `PurchaseAmountSummary` の props。 */
export type PurchaseAmountSummaryProps = {
  /** 表示する購入。 */
  purchase: Purchase;
  /** 合計の参考換算額。読めなければ null。 */
  reference: ReferenceAmount | null;
  /** 値引きの行の直下に添える、値引きの中身。値引きの行が無ければ描かない。 */
  discountDetail?: ReactNode;
};

/**
 * 請求額の内訳。
 *
 * @remarks
 * **確定した金額です。** 小計・値引き・税・送料・合計はいずれもバックエンドが決めた値で、画面は
 * 足し直しません。
 *
 * 値引きの行は値引きが立っているときだけ出し、差し引く額として負の符号で示します。値引きの中身を
 * 添えるかは画面が決めるため、`discountDetail` で受け取ります。
 *
 * 参考換算額を添えるのは合計にだけです。内訳のそれぞれに添えると、どれが請求された金額なのかが
 * 読み取れなくなります。切り替えの振る舞いは
 * [`AmountWithReference`](../../../../components/design-system/display/amount-with-reference/README.md)
 * が持ちます。
 *
 * 購入完了と購入詳細の両方がこれを出すため `facade` に置いています（README 参照）。
 *
 * @param props - 受け取る内容。個々の意味は {@link PurchaseAmountSummaryProps} の各メンバーが持つ。
 * @see Storybook `Features/Purchases/AmountSummary`
 */
export function PurchaseAmountSummary({
  purchase,
  reference,
  discountDetail,
}: PurchaseAmountSummaryProps) {
  const rows: { label: string; amount: number; detail?: ReactNode }[] = [
    { label: "小計", amount: purchase.subtotalAmount },
    ...(purchase.discountAmount > 0
      ? [{ label: "クーポン値引き", amount: -purchase.discountAmount, detail: discountDetail }]
      : []),
    { label: "税", amount: purchase.taxAmount },
    { label: "送料", amount: purchase.shippingFee },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        {rows.map((row) => (
          <div key={row.label}>
            <p className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="tabular-nums">{formatMoney(row.amount)}</span>
            </p>
            {row.detail}
          </div>
        ))}
      </div>
      <Separator />
      <AmountWithReference amount={purchase.totalAmount} label="合計" reference={reference} />
    </div>
  );
}
