import type { ProductDiscontinueImpact, ProductDiscontinueResult } from "@/model/product/product";
import { toProductId } from "@/model/product/product";
import type { PurchaseHistoryEntry } from "@/model/purchase/purchase";
import { PURCHASE_STATUS } from "@/model/purchase/purchase-status";

/** 契約が許す商品名の最大長（`src/adapters/gen/api/endpoints.zod.ts`）。 */
const MAX_NAME_LENGTH = 255;

/**
 * 折り返しの有無を見分けるため、区切りの無い長い語と日本語を混ぜる。
 *
 * @param length - 生成する文字列の長さ
 * @returns 指定した長さの文字列
 */
function longText(length: number): string {
  const unit = "超高性能ワイヤレスノイズキャンセリングイヤホン-第3世代-ProMaxUltraEdition-";

  return unit.repeat(Math.ceil(length / unit.length)).slice(0, length);
}

/** 廃番にしようとしている商品。 */
export const DISCONTINUE_PRODUCT = {
  id: toProductId("0195f0c2-0000-7000-8000-000000000001"),
  name: "ワイヤレスイヤホン",
};

/** 契約上の最大長の名前を持つ商品。 */
export const LONG_NAME_DISCONTINUE_PRODUCT = {
  ...DISCONTINUE_PRODUCT,
  name: longText(MAX_NAME_LENGTH),
};

/** 実行できる見積もり。カート件数は利用者数以上で、進行中の購入は無い。 */
export const OPEN_IMPACT: ProductDiscontinueImpact = {
  affectedCartCount: 42,
  affectedUserCount: 37,
  inProgressPurchaseCount: 0,
};

/** どのカートにも入っていない見積もり。 */
export const UNTOUCHED_IMPACT: ProductDiscontinueImpact = {
  affectedCartCount: 0,
  affectedUserCount: 0,
  inProgressPurchaseCount: 0,
};

/** 進行中の購入が残っている見積もり。 */
export const BLOCKED_IMPACT: ProductDiscontinueImpact = {
  affectedCartCount: 42,
  affectedUserCount: 37,
  inProgressPurchaseCount: 3,
};

/** 廃番を拒ませている進行中の購入。状態が異なるものを並べる。 */
export const REMAINING_PURCHASES = [
  {
    code: "0195f0c2-0000-7000-9000-000000000021",
    totalAmount: 1_999,
    statusCode: PURCHASE_STATUS.UNPROCESSED,
    statusName: "未処理",
    orderedAt: new Date("2026-08-10T11:20:00+09:00"),
  },
  {
    code: "0195f0c2-0000-7000-9000-000000000022",
    totalAmount: 25_480,
    statusCode: PURCHASE_STATUS.PAID,
    statusName: "支払い済み",
    orderedAt: new Date("2026-08-11T09:05:00+09:00"),
  },
  {
    code: "0195f0c2-0000-7000-9000-000000000023",
    totalAmount: 3_998,
    statusCode: PURCHASE_STATUS.SHIPPED,
    statusName: "発送済み",
    orderedAt: new Date("2026-08-12T15:48:00+09:00"),
  },
] satisfies readonly [PurchaseHistoryEntry, ...PurchaseHistoryEntry[]];

/** 実行の応答。見積もりとは異なる件数にしてあり、応答の側の数が出ることを見分けられる。 */
export const DISCONTINUE_RESULT: ProductDiscontinueResult = {
  discontinuedAt: "2026-08-14T10:30:00.000Z",
  affectedCartCount: 43,
  affectedUserCount: 38,
  issuedCouponCount: 38,
};

/** 既に廃番の商品の廃番日時。 */
export const DISCONTINUED_AT = new Date("2026-08-01T09:00:00.000Z");
