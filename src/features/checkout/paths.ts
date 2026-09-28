import { CHECKOUT_PATH } from "./facade/paths/paths";

/** 購入が成立したことを伝える画面。 */
const CHECKOUT_COMPLETE_PATH = `${CHECKOUT_PATH}/complete`;

/** 成立した購入を指す検索条件の名前。 */
export const PURCHASE_PARAM = "purchase";

/**
 * 成立した購入の完了画面を指す。
 *
 * @remarks
 * 購入を URL に載せるのは、確定の送信と完了の表示を別の遷移に分けるためです。送信した画面の
 * ままで完了を出すと、再読み込みで完了が消え、戻る操作が確定前の画面へ帰ります。
 *
 * @param purchaseCode - 購入コード。利用者へ注文番号として見せている値
 * @returns 完了画面の URL。
 */
export function purchaseCompletePath(purchaseCode: string): string {
  return `${CHECKOUT_COMPLETE_PATH}?${PURCHASE_PARAM}=${encodeURIComponent(purchaseCode)}`;
}
