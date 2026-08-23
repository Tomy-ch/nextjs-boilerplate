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
const SETTLED_STATUS_CODES: readonly number[] = [
  PURCHASE_STATUS.COMPLETED,
  PURCHASE_STATUS.DELIVERED,
];

/** 取り消された購入のステータス。買ったものが届かない終端はこれだけです。 */
const CANCELED_STATUS_CODES: readonly number[] = [PURCHASE_STATUS.CANCELED];

/**
 * ステータスの業務キーから、badge の見た目を選ぶ。
 *
 * @remarks
 * **3 つに束ねます。** 進行中・望ましい終端・取り消しで、これはバックエンドの状態遷移が持つ区別
 * そのものです（終端かどうか、取り消しかどうか）。9 つあるステータスに 9 通りの色を当てないのは、
 * 利用者が履歴を眺めて知りたいのが「届いたか / 止まったか / まだ動いているか」の 3 つだからです。
 *
 * **色は文言の補強でしかありません。** 緑と赤の区別は色覚特性によっては付かないため、badge は
 * 必ずステータスの名称を文字で持ちます（[0100](../../../../../docs/adr/0100-accessibility-target.md)）。
 *
 * `facade` に置くのは、購入完了とも共有する控え（{@link ../receipt/receipt}）がこの対応を
 * 必要とするためです（README 参照）。
 *
 * 知らない業務キーは進行中へ倒します。マスタにステータスが増えても、色が付かないだけで一覧は
 * 読めます。既定を終端側に置くと、増えたステータスがすべて「届いた」または「止まった」に見えます。
 *
 * @param statusCode - 契約が解決済みで返すステータスの業務キー
 */
export function toStatusEmphasis(statusCode: number): BadgeVariant {
  if (SETTLED_STATUS_CODES.includes(statusCode)) {
    return BADGE_VARIANT.SUCCESS;
  }

  if (CANCELED_STATUS_CODES.includes(statusCode)) {
    return BADGE_VARIANT.DESTRUCTIVE;
  }

  return BADGE_VARIANT.SECONDARY;
}
