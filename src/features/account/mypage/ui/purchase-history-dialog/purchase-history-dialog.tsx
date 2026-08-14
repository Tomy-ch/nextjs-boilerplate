"use client";

import { Button } from "@/components/design-system/action/button/button";
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
} from "@/components/design-system/action/button/button.definition";
import { ScrollArea } from "@/components/design-system/container/scroll-area/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/design-system/display/table/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/design-system/overlay/dialog/dialog";
import { formatDateTime } from "@/model/datetime";
import { formatMoney } from "@/model/money";
import type { PurchaseHistoryPage } from "@/model/purchase/purchase";

const TABLE_LABEL = "購入履歴";

/**
 * 購入履歴を dialog で一覧する。
 *
 * @remarks
 * 集計のカードに全件を並べません。件数が増えるほどカードが縦に伸び、その下に置いた操作が
 * 押し下げられます。局所スクロールを持つ dialog に移すと、周囲の内容が視界に留まったまま
 * 読み進められます。
 *
 * **並んでいるのが全部とは限りません。** 契約は cursor 方式で、ここが持っているのは最初の
 * 1 ページだけです。続きがある場合はその旨を明示します。黙って切ると、古い購入が無いように
 * 見えます。
 *
 * 期間での絞り込みは持ちません。契約が受け取るのは cursor の 2 つだけで、取得済みのページに
 * client 側で日付の条件を掛けると、条件に合う古い購入が落ちた一覧になります。
 */
export function PurchaseHistoryDialog({ purchases }: { readonly purchases: PurchaseHistoryPage }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          disabled={purchases.items.length === 0}
          size={BUTTON_SIZE.SMALL}
          variant={BUTTON_VARIANT.OUTLINE}
        >
          もっと見る
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{TABLE_LABEL}</DialogTitle>
          <DialogDescription>
            {purchases.nextCursor === null
              ? "注文日時の新しい順に並んでいます。"
              : "注文日時の新しい順に、最近の分だけを表示しています。これより古い購入は含まれていません。"}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea aria-label={TABLE_LABEL} className="max-h-96">
          <Table label={TABLE_LABEL}>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">注文日時</TableHead>
                <TableHead scope="col">購入コード</TableHead>
                <TableHead scope="col">ステータス</TableHead>
                <TableHead className="text-right" scope="col">
                  金額
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.items.map((purchase) => (
                <TableRow key={purchase.code}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(purchase.orderedAt)}
                  </TableCell>
                  <TableHead className="font-mono text-xs" scope="row">
                    {purchase.code}
                  </TableHead>
                  <TableCell>{purchase.statusName}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(purchase.totalAmount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
