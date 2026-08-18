import { Separator } from "@/components/design-system/display/separator/separator";
import { formatMoney, type ReferenceAmount } from "@/model/money";
import type { Purchase } from "@/model/purchase/purchase";

import { AmountWithReference } from "../../../ui/amount-with-reference/amount-with-reference";

/** `AmountBreakdown` の props。 */
export type AmountBreakdownProps = {
  /** 成立した購入。 */
  purchase: Purchase;
  /** 合計の参考換算額。読めなければ null。 */
  reference: ReferenceAmount | null;
};

/**
 * 請求額の内訳。
 *
 * @remarks
 * **確定した金額です。** 確認の画面で出せたのは小計までで、税と送料はこの購入が成立した時点で
 * 決まりました。値はいずれもバックエンドが決めたもので、画面は足し直しません
 * （[0070](../../../../../docs/adr/0070-backend-role-separation.md)）。
 *
 * 参考換算額を添えるのは合計にだけです。内訳のそれぞれに添えると、どれが請求される金額なのかが
 * 読み取れなくなります。
 */
export function AmountBreakdown({ purchase, reference }: AmountBreakdownProps) {
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
      <AmountWithReference amount={purchase.totalAmount} label="合計" reference={reference} />
    </div>
  );
}
