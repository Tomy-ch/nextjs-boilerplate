import type { ActionState } from "@/model/action-state";
import type { ProductDiscontinueResult } from "@/model/product/product";

/** 廃番の送信のうち、入力した人が直せる項目。 */
export type DiscontinueProductField = "couponDiscountRate" | "couponValidityDays";

/** 廃番の送信の結果。成功値に実行の応答をそのまま持つ。 */
export type DiscontinueProductState = ActionState<
  ProductDiscontinueResult,
  DiscontinueProductField
>;

/** 商品を廃番にする送信先。 */
export type DiscontinueProductAction = (
  state: DiscontinueProductState,
  formData: FormData,
) => Promise<DiscontinueProductState>;

/** 入力欄の項目名。接続先に弾かれた項目を、項目名を主語にして伝えるために使う。 */
export const DISCONTINUE_FIELD_LABELS: Readonly<Record<DiscontinueProductField, string>> = {
  couponDiscountRate: "値引き率",
  couponValidityDays: "有効日数",
};

/** 対象・冪等キー・確認の合図のいずれかが送られてこなかったときの文言。 */
export const DISCONTINUE_TARGET_LOST_MESSAGE =
  "送信の内容が揃っていません。画面を開き直してから、もう一度お試しください。";

/** 進行中の購入が残っていて拒まれたときの文言。 */
export const DISCONTINUE_CONFLICT_MESSAGE =
  "進行中の購入が残っていたため廃番にできませんでした。最新の見積もりを表示しています。";
