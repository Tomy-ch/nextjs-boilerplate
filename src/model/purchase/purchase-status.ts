/**
 * 購入ステータスの業務キー。
 *
 * @remarks
 * **分岐はこの値で行い、名称では行いません。** 名称は利用者へ見せるための文言で、backend 側の
 * 都合で書き換わります。契約はステータスに業務キーと名称の両方を載せ、業務キーのほうを分岐に
 * 使うものとして定義しています。
 *
 * **値は到達順序を意味しません。** 完了（5）よりキャンセル（6）や支払い済み（7）のほうが大きく、
 * 大小比較で遷移の可否や終端かどうかを判定することはできません。
 *
 * ここに無い値はマスタが増えたときに届きます。知らない値の扱いは、判定する側がそれぞれ決めます。
 */
export const PURCHASE_STATUS = {
  UNPROCESSED: 1,
  ACCEPTED: 2,
  CONFIRMING: 3,
  PROCESSING: 4,
  COMPLETED: 5,
  CANCELED: 6,
  PAID: 7,
  SHIPPED: 8,
  DELIVERED: 9,
} as const satisfies Readonly<Record<string, number>>;

/**
 * 進行中の購入の業務キー。完了・キャンセル・配達済みのいずれでもない状態。
 *
 * @remarks
 * 契約が「進行中の購入がある商品は廃番にできない」と数えるときの母集団と同じです。マスタに
 * 状態が増えてもここには入らないので、この並びで絞った結果は契約の件数より少なくなり得ます。
 */
export const IN_PROGRESS_PURCHASE_STATUSES: readonly number[] = [
  PURCHASE_STATUS.UNPROCESSED,
  PURCHASE_STATUS.ACCEPTED,
  PURCHASE_STATUS.CONFIRMING,
  PURCHASE_STATUS.PROCESSING,
  PURCHASE_STATUS.PAID,
  PURCHASE_STATUS.SHIPPED,
];
