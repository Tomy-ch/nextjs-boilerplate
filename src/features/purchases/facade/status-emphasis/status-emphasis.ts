import {
  BADGE_VARIANT,
  type BadgeVariant,
} from "@/components/design-system/display/badge/badge.definition";
import { PURCHASE_STATUS } from "@/model/purchase/purchase-status";

/**
 * 望ましい終端に達した購入のステータス。
 *
 * @remarks
 * バックエンドの状態遷移で「そこから他の状態へ遷移しない」かつ「取り消しではない」ものです。
 */
const SETTLED_STATUS_CODES: ReadonlySet<number> = new Set([
  PURCHASE_STATUS.COMPLETED,
  PURCHASE_STATUS.DELIVERED,
]);

/** 取り消された購入のステータス。買ったものが届かない終端はこれだけです。 */
const CANCELED_STATUS_CODES: ReadonlySet<number> = new Set([PURCHASE_STATUS.CANCELED]);

/**
 * ステータスの業務キーから、badge の見た目を選ぶ。
 *
 * @remarks
 * 知らない業務キーは進行中へ倒します。既定を終端側に置くと、マスタに増えたステータスがすべて
 * 「届いた」または「止まった」に見えます。
 *
 * `facade` に置くのは、購入完了とも共有する控え（`receipt.tsx`）がこの対応を必要とするためです
 * （README 参照）。
 *
 * 3 つに束ねる根拠と、色を文言の補強に留める根拠は
 * [画面要件](../../../../../docs/spec/route/shop/purchases/page.screen.md)「状況」。
 */
export function toStatusEmphasis(statusCode: number): BadgeVariant {
  if (SETTLED_STATUS_CODES.has(statusCode)) {
    return BADGE_VARIANT.SUCCESS;
  }

  if (CANCELED_STATUS_CODES.has(statusCode)) {
    return BADGE_VARIANT.DESTRUCTIVE;
  }

  return BADGE_VARIANT.SECONDARY;
}
