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

/** `PurchaseReceipt` の props。 */
export type PurchaseReceiptProps = {
  /** 成立した購入。 */
  purchase: Purchase;
};

/**
 * 購入の控え。
 *
 * @remarks
 * 見せる識別子は購入コードです。取得に使う ID は利用者が問い合わせに持ち出せる値ではないため、
 * 画面には出しません。
 */
export function PurchaseReceipt({ purchase }: PurchaseReceiptProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ご注文の控え</CardTitle>
      </CardHeader>
      <CardContent>
        <KeyValueList>
          <KeyValueItem>
            <KeyValueLabel>注文番号</KeyValueLabel>
            <KeyValueValue className="break-all">{purchase.code}</KeyValueValue>
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
