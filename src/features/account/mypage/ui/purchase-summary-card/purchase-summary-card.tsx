import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/design-system/display/card/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/design-system/display/table/table";
import { formatMoney } from "@/model/money";
import type { PurchaseSummary } from "@/model/user/user";

const TABLE_LABEL = "ステータス別の購入内訳";

/**
 * 自分の購入の集計。
 *
 * @remarks
 * 総数と合計にはキャンセル済みが含まれます。内訳がキャンセルを 1 行として持つため、除いた値は
 * 表から読み取れます。ここで差し引いた値を別に出さないのは、契約が返した数と画面の数が食い違う
 * 形を作らないためです。
 *
 * 購入が無い場合に表そのものを出しません。列だけが並んだ表は、集計が 0 であることよりも
 * 「読み込みに失敗した」に見えます。
 */
export function PurchaseSummaryCard({ summary }: { readonly summary: PurchaseSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>購入サマリ</CardTitle>
      </CardHeader>
      <CardContent>
        {summary.breakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ購入がありません。</p>
        ) : (
          <Table label={TABLE_LABEL}>
            <TableCaption>{TABLE_LABEL}</TableCaption>
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
}
