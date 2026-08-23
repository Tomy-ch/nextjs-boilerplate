import type { ReferenceAmount } from "@/model/money";
import { toProductId } from "@/model/product/product";
import type { Purchase, PurchaseLine } from "@/model/purchase/purchase";
import { PURCHASE_STATUS } from "@/model/purchase/purchase-status";

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
  code: "0195f0c2-0000-7000-9000-000000000001",
  statusCode: PURCHASE_STATUS.UNPROCESSED,
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
