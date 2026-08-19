import {
  BADGE_VARIANT,
  type BadgeVariant,
} from "@/components/design-system/display/badge/badge.definition";

/**
 * 望ましい終端に達した購入のステータス名。
 *
 * @remarks
 * バックエンドの状態遷移で「そこから他の状態へ遷移しない」かつ「取り消しではない」ものです。
 */
const SETTLED_STATUS_NAMES: readonly string[] = ["完了", "配達済み"];

/** 取り消された購入のステータス名。買ったものが届かない終端はこれだけです。 */
const CANCELED_STATUS_NAMES: readonly string[] = ["キャンセル"];

/**
 * ステータスの名称から、badge の見た目を選ぶ。
 *
 * @remarks
 * **3 つに束ねます。** 進行中・望ましい終端・取り消しで、これはバックエンドの状態遷移が持つ区別
 * そのものです（終端かどうか、取り消しかどうか）。9 つある名称に 9 通りの色を当てないのは、
 * 利用者が履歴を眺めて知りたいのが「届いたか / 止まったか / まだ動いているか」の 3 つだからです。
 *
 * **色は文言の補強でしかありません。** 緑と赤の区別は色覚特性によっては付かないため、badge は
 * 必ずステータスの名称を文字で持ちます（[0100](../../../docs/adr/0100-accessibility-target.md)）。
 *
 * **名称で引くのは暫定です。** 本来の鍵はステータスの業務キー（バックエンドが `code` として持ち、
 * 「外部公開のための業務キー」と定義しているもの）ですが、契約はいま `id` と `name` しか返しません。
 * `id` はマスタの UUID なので画面へ焼き込めず、消去法で名称を鍵にしています。
 *
 * 知らない名称は進行中へ倒します。マスタに名称が増えても、色が付かないだけで一覧は読めます。
 * 既定を終端側に置くと、増えた名称がすべて「届いた」または「止まった」に見えます。
 *
 * @param statusName - 契約が解決済みで返すステータスの名称
 */
export function toStatusEmphasis(statusName: string): BadgeVariant {
  if (SETTLED_STATUS_NAMES.includes(statusName)) {
    return BADGE_VARIANT.SUCCESS;
  }

  if (CANCELED_STATUS_NAMES.includes(statusName)) {
    return BADGE_VARIANT.DESTRUCTIVE;
  }

  return BADGE_VARIANT.SECONDARY;
}
