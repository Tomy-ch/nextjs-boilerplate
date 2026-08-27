import type { ActionState } from "@/model/action-state";

/**
 * 在庫を動かすフォームが持つ項目。
 *
 * @remarks
 * 向きを含みません。選択肢のどちらかが必ず選ばれている形にしてあり、外れた値が届いたときに
 * 指摘する相手は入力した人ではないためです（画面が壊れているか、送信が組み替えられている）。
 */
export type StockFormField = "quantity";

/**
 * 在庫を動かすフォームの結果。
 *
 * @remarks
 * 成功値を持ちません。成立したら一覧へ送るためです。
 */
export type StockFormState = ActionState<void, StockFormField>;

/**
 * 在庫を動かす送信先。
 *
 * @remarks
 * **この画面は送信先を自分で決めません。** 役割の確認は `adapters/server/auth` の領分で、そこへ
 * 触れてよいのは app 層です（`architecture.ts` の `adapters-auth`）。したがって送信先は route が
 * 渡します。
 */
export type AdjustProductStockAction = (
  state: StockFormState,
  formData: FormData,
) => Promise<StockFormState>;

/** 対象そのものが送られてこなかったときの文言。 */
export const STOCK_TARGET_LOST_MESSAGE = "対象の商品が判りません。画面を開き直してください。";

/** 動かす量が数として読めなかったときの文言。 */
export const STOCK_QUANTITY_INVALID_MESSAGE = "1 以上の整数を入力してください。";
