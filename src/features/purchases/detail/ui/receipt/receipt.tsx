import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/design-system/display/card/card";
import {
  KeyValueItem,
  KeyValueLabel,
  KeyValueList,
  KeyValueValue,
} from "@/components/design-system/display/key-value-list/key-value-list";
import { formatDateTime } from "@/model/datetime";
import type { Purchase } from "@/model/purchase/purchase";

/** `PurchaseReceiptCard` の props。 */
export type PurchaseReceiptCardProps = {
  /** 表示する購入。 */
  purchase: Purchase;
};

/**
 * 購入の控え。
 *
 * @remarks
 * 見せる識別子は購入コードです。取得に使う ID は利用者が問い合わせに持ち出せる値ではないため、
 * 画面には出しません。
 *
 * 折り返しを許すのは、契約が返すのが UUID で、狭い幅では 1 行に収まらないためです。詰めて隠すと、
 * 問い合わせのときに全文を読み取れません。
 */
export function PurchaseReceiptCard({ purchase }: PurchaseReceiptCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ご注文の控え</CardTitle>
      </CardHeader>
      <CardContent>
        <KeyValueList>
          <KeyValueItem>
            <KeyValueLabel>注文番号</KeyValueLabel>
            <KeyValueValue className="break-all font-mono">{purchase.code}</KeyValueValue>
          </KeyValueItem>
          <KeyValueItem>
            <KeyValueLabel>注文日時</KeyValueLabel>
            <KeyValueValue>{formatDateTime(purchase.orderedAt)}</KeyValueValue>
          </KeyValueItem>
          <KeyValueItem>
            <KeyValueLabel>状況</KeyValueLabel>
            <KeyValueValue>{purchase.statusName}</KeyValueValue>
          </KeyValueItem>
        </KeyValueList>
      </CardContent>
    </Card>
  );
}
