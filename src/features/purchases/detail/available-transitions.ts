import { PURCHASE_STATUS } from "@/model/purchase/purchase-status";

/**
 * この画面で本人ができること。
 *
 * @remarks
 * 管理側の遷移（発送・配達完了）は含みません。役割の確認を伴い、対象の見つけ方も違うためです。
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
 * **この画面の持ち物です。** バックエンドが持つ状態遷移の規則を写したものなので、カーネルへは
 * 上げません（[0021](../../../../docs/adr/0021-frontend-responsibility.md)）。管理側の操作が同じ
 * 判定を必要としたときに、そこで初めて共有先を決めます。
 *
 * **判定の正はバックエンドにあります**（[0070](../../../../docs/adr/0070-backend-role-separation.md)）。
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
