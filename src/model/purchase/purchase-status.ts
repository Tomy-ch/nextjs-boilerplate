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
 * 本人がキャンセルできるステータス。
 *
 * @remarks
 * 契約が `PATCH /v1/purchases/{purchaseCode}/cancel` に宣言している「キャンセル可能状態」です。
 * 発送を終えた購入と、終端に達した購入（完了 / キャンセル / 配達済み）は含みません。
 */
const CANCELABLE_STATUS_CODES: readonly number[] = [
  PURCHASE_STATUS.UNPROCESSED,
  PURCHASE_STATUS.ACCEPTED,
  PURCHASE_STATUS.CONFIRMING,
  PURCHASE_STATUS.PROCESSING,
  PURCHASE_STATUS.PAID,
];

/**
 * 本人が支払えるステータス。
 *
 * @remarks
 * 契約が `PATCH /v1/purchases/{purchaseCode}/pay` に宣言している「未払い相当」です。支払い済みは
 * 含みません（二重支払いとして拒まれます）。
 */
const PAYABLE_STATUS_CODES: readonly number[] = [
  PURCHASE_STATUS.UNPROCESSED,
  PURCHASE_STATUS.ACCEPTED,
  PURCHASE_STATUS.CONFIRMING,
  PURCHASE_STATUS.PROCESSING,
];

/**
 * その購入をキャンセルできるかを返す。
 *
 * @remarks
 * **判定の正はバックエンドにあります**（[0070](../../../docs/adr/0070-backend-role-separation.md)）。
 * ここが決めるのは操作を見せるかどうかだけで、送った結果が拒まれる余地は残ります。読み込んでから
 * 押すまでの間に状態が進むためで、そのときは `conflict` として返ります。
 *
 * **知らない業務キーには操作を見せません。** マスタが増えたときに、可否を確かめていない状態へ
 * 不可逆な操作を出すことになります。
 *
 * @param statusCode - 契約が解決済みで返すステータスの業務キー
 */
export function canCancelPurchase(statusCode: number): boolean {
  return CANCELABLE_STATUS_CODES.includes(statusCode);
}

/**
 * その購入を支払えるかを返す。
 *
 * @remarks
 * 可否の正の在処と、知らない業務キーの扱いは {@link canCancelPurchase} と同じです。
 *
 * @param statusCode - 契約が解決済みで返すステータスの業務キー
 */
export function canPayPurchase(statusCode: number): boolean {
  return PAYABLE_STATUS_CODES.includes(statusCode);
}
