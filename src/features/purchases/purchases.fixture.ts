import type { ReferenceAmount } from "@/model/money";
import { toProductId } from "@/model/product/product";
import type { Purchase, PurchaseHistoryEntry, PurchaseLine } from "@/model/purchase/purchase";

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
    statusName: "未処理",
    orderedAt: new Date("2026-08-17T10:30:00+09:00"),
  },
  {
    code: "0195f0c2-0000-7000-9000-000000000002",
    totalAmount: 4_398,
    statusName: "発送済み",
    orderedAt: new Date("2026-07-30T21:05:00+09:00"),
  },
  {
    code: "0195f0c2-0000-7000-9000-000000000003",
    totalAmount: 149_800,
    statusName: "配達済み",
    orderedAt: new Date("2026-06-02T09:12:00+09:00"),
  },
  {
    code: "0195f0c2-0000-7000-9000-000000000004",
    totalAmount: 990,
    statusName: "キャンセル",
    orderedAt: new Date("2026-05-11T18:44:00+09:00"),
  },
];

/** 桁の大きい金額。合計の桁が伸びても行の並びが崩れないかを見るために置く。 */
export const LARGE_AMOUNT_ENTRY: PurchaseHistoryEntry = {
  code: "0195f0c2-0000-7000-9000-000000000005",
  totalAmount: 1_234_567_890,
  statusName: "支払い済み",
  orderedAt: new Date("2026-04-01T00:00:00+09:00"),
};

/** 読み進めた後の一覧。同じ形の購入を並べて長さだけを作る。 */
export const LOADED_ENTRIES: readonly PurchaseHistoryEntry[] = [
  ...HISTORY_ENTRIES,
  ...Array.from({ length: 12 }, (_, index) => ({
    code: `0195f0c2-0000-7000-9000-0000001000${String(index).padStart(2, "0")}`,
    totalAmount: 3_300 + index * 111,
    statusName: "配達済み",
    orderedAt: new Date(`2026-03-${String(28 - index).padStart(2, "0")}T12:00:00+09:00`),
  })),
];

/** 合計（{@link PURCHASE_DETAIL}）の参考換算額。 */
export const TOTAL_REFERENCE: ReferenceAmount = {
  currency: "JPY",
  amount: 3_193_050,
  rate: "150.00",
  rateDate: "2026-08-17",
};

/** 事情の無い明細。 */
const EARPHONE_LINE = {
  productId: toProductId("0195f0c2-0000-7000-8000-000000000001"),
  productName: "ワイヤレスイヤホン",
  quantity: 3,
  unitPrice: "19.99",
} satisfies PurchaseLine;

/** 名前が長い明細。器の幅を確かめるために実物どおりの長さを持つ。 */
const WATCH_LINE = {
  productId: toProductId("0195f0c2-0000-7000-8000-000000000002"),
  productName: "スマートウォッチ（第 2 世代・GPS 搭載モデル・ステンレスバンド付き）",
  quantity: 1,
  unitPrice: "129.00",
} satisfies PurchaseLine;

/** 明細の付いた購入 1 件。 */
export const PURCHASE_DETAIL: Purchase = {
  id: "0195f0c2-0000-7000-9000-000000000001",
  code: "0195f0c2-0000-7000-9000-000000000001",
  statusName: "未処理",
  subtotalAmount: 18_897,
  taxAmount: 1_890,
  shippingFee: 500,
  totalAmount: 21_287,
  lines: [EARPHONE_LINE, WATCH_LINE],
  orderedAt: new Date("2026-08-17T10:30:00+09:00"),
};

/** 明細が 1 行だけの購入。控えと内訳の段が、明細の短さでどう見えるかを確かめる。 */
export const SINGLE_LINE_PURCHASE: Purchase = {
  ...PURCHASE_DETAIL,
  subtotalAmount: 5_997,
  taxAmount: 599,
  shippingFee: 500,
  totalAmount: 7_096,
  lines: [EARPHONE_LINE],
};
