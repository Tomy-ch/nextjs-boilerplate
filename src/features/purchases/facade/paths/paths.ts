/**
 * この feature が持つルート。
 *
 * @remarks
 * `facade` へ置くのは、マイページ（`account`）がここを指すためです。feature どうしは直接 import
 * できず、公開する口だけをここへ出します（[0021](../../../../../docs/adr/0021-frontend-responsibility.md)）。
 * 指す側が宛先を書き写すと、ルートを変えたときに古い宛先が残ります。
 */

/** 購入履歴。global nav が直接指す。 */
export const PURCHASE_HISTORY_PATH = "/purchases";

/**
 * 購入 1 件の詳細を指す。
 *
 * @remarks
 * 受け取るのは購入の ID です。利用者へ見せる購入コードでは次の取得ができません。
 *
 * @param purchaseId - 購入の ID。利用者へ見せる購入コードではない
 */
export function purchaseDetailPath(purchaseId: string): string {
  return `${PURCHASE_HISTORY_PATH}/${encodeURIComponent(purchaseId)}`;
}
