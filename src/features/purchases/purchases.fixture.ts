import type { PurchaseHistoryEntry } from "@/model/purchase/purchase";
import { PURCHASE_STATUS } from "@/model/purchase/purchase-status";

/**
 * 履歴に並ぶ購入。
 *
 * @remarks
 * 注文日時の降順です。契約が返す順序であり、並べ替えの条件は受け付けません。
 */
export const HISTORY_ENTRIES: readonly PurchaseHistoryEntry[] = [
  {
    code: "0195f0c2-0000-7000-9000-000000000001",
    totalAmount: 21_287,
    statusCode: PURCHASE_STATUS.UNPROCESSED,
    statusName: "未処理",
    orderedAt: new Date("2026-08-17T10:30:00+09:00"),
  },
  {
    code: "0195f0c2-0000-7000-9000-000000000002",
    totalAmount: 4_398,
    statusCode: PURCHASE_STATUS.SHIPPED,
    statusName: "発送済み",
    orderedAt: new Date("2026-07-30T21:05:00+09:00"),
  },
  {
    code: "0195f0c2-0000-7000-9000-000000000003",
    totalAmount: 149_800,
    statusCode: PURCHASE_STATUS.DELIVERED,
    statusName: "配達済み",
    orderedAt: new Date("2026-06-02T09:12:00+09:00"),
  },
  {
    code: "0195f0c2-0000-7000-9000-000000000004",
    totalAmount: 990,
    statusCode: PURCHASE_STATUS.CANCELED,
    statusName: "キャンセル",
    orderedAt: new Date("2026-05-11T18:44:00+09:00"),
  },
];

/** 桁の大きい金額。合計の桁が伸びても行の並びが崩れないかを見るために置く。 */
export const LARGE_AMOUNT_ENTRY: PurchaseHistoryEntry = {
  code: "0195f0c2-0000-7000-9000-000000000005",
  totalAmount: 1_234_567_890,
  statusCode: PURCHASE_STATUS.PAID,
  statusName: "支払い済み",
  orderedAt: new Date("2026-04-01T00:00:00+09:00"),
};

/** 読み進めた後の一覧。同じ形の購入を並べて長さだけを作る。 */
export const LOADED_ENTRIES: readonly PurchaseHistoryEntry[] = [
  ...HISTORY_ENTRIES,
  ...Array.from({ length: 12 }, (_, index) => ({
    code: `0195f0c2-0000-7000-9000-0000001000${String(index).padStart(2, "0")}`,
    totalAmount: 3_300 + index * 111,
    statusCode: PURCHASE_STATUS.DELIVERED,
    statusName: "配達済み",
    orderedAt: new Date(`2026-03-${String(28 - index).padStart(2, "0")}T12:00:00+09:00`),
  })),
];
