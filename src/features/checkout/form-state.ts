import type { ActionState } from "@/model/action-state";
import type { COUPON_ID_FIELD } from "./form-fields";

/** 確定の結果が名指しし得る項目。 */
type PlaceOrderField = typeof COUPON_ID_FIELD;

/**
 * 購入確定の結果。
 *
 * @remarks
 * 成功値を持ちません。成立したら完了画面へ送るため、成功した状態がこの画面に現れることが
 * ありません。ここに現れるのは失敗だけです。
 */
export type PlaceOrderFormState = ActionState<void, PlaceOrderField>;
