"use client";

import Link from "next/link";

import { Button } from "@/components/design-system/action/button/button";
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
} from "@/components/design-system/action/button/button.definition";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/design-system/overlay/dialog/dialog";
import { formatDateTime } from "@/model/datetime";
import { formatMoney } from "@/model/money";
import type { PurchaseHistoryPage } from "@/model/purchase/purchase";

import { PURCHASE_HISTORY_PATH } from "../../../paths";

const TITLE = "購入サマリ詳細";

/**
 * この面に並べる件数。
 *
 * @remarks
 * 集計の内訳を確かめに来た利用者に見せる範囲で、履歴そのものを読む場所ではありません。
 * ここを増やすほど購入履歴の画面と役割が重なります。
 */
const VISIBLE_COUNT = 10;

/**
 * 購入サマリの詳細。直近の購入を dialog で一覧する。
 *
 * @remarks
 * 集計のカードに全件を並べません。件数が増えるほどカードが縦に伸び、その下に置いた操作が
 * 押し下げられます。
 *
 * **並んでいるのが全部とは限りません。** 上位 {@link VISIBLE_COUNT} 件で切り、それ以上ある
 * ときは購入履歴の画面へ送ります。黙って切ると、古い購入が無いように見えます。
 *
 * 期間での絞り込みは持ちません。契約が受け取るのは cursor の 2 つだけで、取得済みのページに
 * client 側で日付の条件を掛けると、条件に合う古い購入が落ちた一覧になります。範囲で絞る操作は
 * 購入履歴の画面が持ちます。
 *
 * 表を外側のスクロール領域で包みません。`Table` 自身がスクロール領域を持つため、包むと領域が
 * 入れ子になり、内側が縦の操作を吸って外側が動かなくなります。高さの上限は `containerClassName`
 * で表の側へ渡します。
 */
export function PurchaseHistoryDialog({ purchases }: { readonly purchases: PurchaseHistoryPage }) {
  const visible = purchases.items.slice(0, VISIBLE_COUNT);
  const hasMore = purchases.items.length > VISIBLE_COUNT || purchases.nextCursor !== null;

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
          <DialogTitle>{TITLE}</DialogTitle>
          <DialogDescription>
            {hasMore
              ? `注文日時の新しい順に ${VISIBLE_COUNT} 件を表示しています。これより古い購入は購入履歴で確認できます。`
              : "注文日時の新しい順に並んでいます。"}
          </DialogDescription>
        </DialogHeader>
        <Table containerClassName="max-h-96" label={TITLE}>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">注文日時</TableHead>
              <TableHead scope="col">ステータス</TableHead>
              <TableHead scope="col">購入コード</TableHead>
              <TableHead className="text-right" scope="col">
                金額
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((purchase) => (
              <TableRow key={purchase.code}>
                <TableCell className="whitespace-nowrap">
                  {formatDateTime(purchase.orderedAt)}
                </TableCell>
                <TableCell>{purchase.statusName}</TableCell>
                <TableHead className="font-mono text-xs font-normal" scope="row">
                  {purchase.code}
                </TableHead>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(purchase.totalAmount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {hasMore ? (
          <DialogFooter>
            <Button asChild variant={BUTTON_VARIANT.OUTLINE}>
              <Link href={PURCHASE_HISTORY_PATH}>購入履歴をすべて見る</Link>
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
