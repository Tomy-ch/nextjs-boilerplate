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
