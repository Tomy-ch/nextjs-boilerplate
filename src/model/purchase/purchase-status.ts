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
 * 本人が購入に対してできること。
 *
 * @remarks
 * admin の遷移（発送・配達完了）は含みません。役割の確認を伴い、対象の見つけ方も違うためです。
 */
export const PURCHASE_TRANSITION = {
  PAY: "pay",
  CANCEL: "cancel",
} as const satisfies Readonly<Record<string, string>>;

/** {@link PURCHASE_TRANSITION} の値。 */
export type PurchaseTransition = (typeof PURCHASE_TRANSITION)[keyof typeof PURCHASE_TRANSITION];

/**
 * ステータスごとにできること。
 *
 * @remarks
 * 契約が `PATCH /v1/purchases/{purchaseCode}/pay` と `.../cancel` に宣言している遷移可能な状態を、
 * ステータスの側から引き直したものです。**並びは画面に出す順**で、進む操作を先に置きます。
 *
 * 終端（完了 / キャンセル / 配達済み）と発送済みは、できることがないので現れません。
 */
const AVAILABLE_TRANSITIONS: Readonly<Record<number, readonly PurchaseTransition[]>> = {
  [PURCHASE_STATUS.UNPROCESSED]: [PURCHASE_TRANSITION.PAY, PURCHASE_TRANSITION.CANCEL],
  [PURCHASE_STATUS.ACCEPTED]: [PURCHASE_TRANSITION.PAY, PURCHASE_TRANSITION.CANCEL],
  [PURCHASE_STATUS.CONFIRMING]: [PURCHASE_TRANSITION.PAY, PURCHASE_TRANSITION.CANCEL],
  [PURCHASE_STATUS.PROCESSING]: [PURCHASE_TRANSITION.PAY, PURCHASE_TRANSITION.CANCEL],
  [PURCHASE_STATUS.PAID]: [PURCHASE_TRANSITION.CANCEL],
};

/**
 * その購入に対して本人がいまできることを、画面に出す順で返す。
 *
 * @remarks
 * **判定の正はバックエンドにあります**（[0070](../../../docs/adr/0070-backend-role-separation.md)）。
 * ここが決めるのは操作を見せるかどうかだけで、送った結果が拒まれる余地は残ります。読み込んでから
 * 押すまでの間に状態が進むためで、そのときは `conflict` として返ります。
 *
 * **知らない業務キーには何も返しません。** マスタが増えたときに、可否を確かめていない状態へ不可逆な
 * 操作を出すことになります。
 *
 * @param statusCode - 契約が解決済みで返すステータスの業務キー
 */
export function availablePurchaseTransitions(statusCode: number): readonly PurchaseTransition[] {
  return AVAILABLE_TRANSITIONS[statusCode] ?? [];
}
