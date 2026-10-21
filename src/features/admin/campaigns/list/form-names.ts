/**
 * 停止の送信が持つ項目の名前。
 *
 * @remarks
 * 送る側と受け取る側が同じ綴りを使うための宣言です。冪等キーはここに無く、
 * `IDEMPOTENCY_KEY_FIELD`（`model/idempotency-key`）の綴りで載ります。
 */
export const SUSPEND_FORM_NAMES = {
  /** 停止するキャンペーン。 */
  campaignId: "campaignId",
  /** 結果の文言に使うコード。 */
  campaignCode: "campaignCode",
} as const;
