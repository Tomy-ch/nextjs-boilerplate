import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/design-system/display/card/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/design-system/display/table/table";
import { formatMoney } from "@/model/money";
import type { PurchaseHistoryPage } from "@/model/purchase/purchase";
import type { PurchaseSummary } from "@/model/user/user";
import { withPartSpan } from "@/observability/render-span";
import { PurchaseHistoryDialog } from "../purchase-history-dialog/purchase-history-dialog";

const TABLE_LABEL = "ステータス別の購入内訳";

type PurchaseSummaryCardProps = {
  readonly summary: PurchaseSummary;
  readonly purchases: PurchaseHistoryPage;
};

/**
 * 自分の購入の集計。
 *
 * @remarks
 * 総数と合計は**キャンセル済みを除いた**値です。契約がそう定めており、内訳にもキャンセルの行は
 * 現れません。ここで別途キャンセル分を出さないのは、契約が返した数と画面の数が食い違う形を
 * 作らないためです。
 *
 * 購入が無い場合に表そのものを出しません。列だけが並んだ表は、集計が 0 であることよりも
 * 「読み込みに失敗した」に見えます。
 *
 * 表に caption を置きません。カードの見出しが同じことを言っており、`Table` の `label` が
 * scroll 領域の名前を供給するので、支援技術から見た名前も失われません。
 */
export const PurchaseSummaryCard = withPartSpan(
  "features/account/mypage/ui/purchase-summary-card/purchase-summary-card",
  ({ purchases, summary }: PurchaseSummaryCardProps) => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>購入サマリ</CardTitle>
          <CardAction>
            <PurchaseHistoryDialog purchases={purchases} />
          </CardAction>
        </CardHeader>
        <CardContent>
          {summary.breakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ購入がありません。</p>
          ) : (
            <Table label={TABLE_LABEL}>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">ステータス</TableHead>
                  <TableHead className="text-right" scope="col">
                    件数
                  </TableHead>
                  <TableHead className="text-right" scope="col">
                    金額
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.breakdown.map((entry) => (
                  <TableRow key={entry.statusId}>
                    <TableHead scope="row">{entry.statusName}</TableHead>
                    <TableCell className="text-right tabular-nums">{`${entry.count} 件`}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(entry.totalAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableHead scope="row">合計</TableHead>
                  <TableCell className="text-right tabular-nums">{`${summary.totalCount} 件`}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(summary.totalAmount)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    );
  },
);
