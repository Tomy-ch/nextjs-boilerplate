/** 発行の送信が載せる項目の `name`。値引きと範囲の `name` は共有の部品が持つ。 */
export const ISSUE_FORM_NAMES = {
  userId: "userId",
  expiresAt: "expiresAt",
  usableFrom: "usableFrom",
  minPurchaseAmount: "minPurchaseAmount",
  confirmed: "confirmed",
} as const;

/** 確認を経た送信だけが載せる値。 */
export const ISSUE_CONFIRMED_VALUE = "true";
