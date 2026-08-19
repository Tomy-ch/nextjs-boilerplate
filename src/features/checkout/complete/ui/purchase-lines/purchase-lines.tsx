import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/design-system/display/card/card";
import type { PurchaseLine } from "@/model/purchase/purchase";

/** `PurchaseLines` の props。 */
export type PurchaseLinesProps = {
  /** 成立した購入の明細。 */
  lines: readonly PurchaseLine[];
};

/**
 * 購入した明細。
 *
 * @remarks
 * 単価は**購入した時点の値**です。商品の現在価格が変わっても動きません。商品名だけは現在の
 * 名称で解決されて届くため、名前と単価は別の時点を指しています。
 *
 * 行ごとの金額は出しません。単価と数量を掛けると、画面が金額を作ることになります。合算した
 * 値は内訳が持ちます（[0070](../../../../../docs/adr/0070-backend-role-separation.md)）。
 */
export function PurchaseLines({ lines }: PurchaseLinesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ご購入いただいた商品</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {lines.map((line) => (
            <li className="flex flex-wrap items-start gap-x-4 gap-y-1 py-4" key={line.productId}>
              <div className="flex min-w-0 flex-1 basis-40 flex-col gap-1">
                <p className="font-emphasis text-sm">{line.productName}</p>
                <p className="text-muted-foreground text-sm">{`$${line.unitPrice} / 個`}</p>
              </div>
              <p className="text-sm tabular-nums">{`${line.quantity} 個`}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
