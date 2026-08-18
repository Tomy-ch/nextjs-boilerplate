import type { ActionState } from "@/model/action-state";

/**
 * 購入確定の結果。
 *
 * @remarks
 * 成功値を持ちません。成立したら完了画面へ送るため、成功した状態がこの画面に現れることが
 * ありません（[0063](../../../docs/adr/0063-mutation-result-notification.md)）。ここに現れるのは
 * 失敗だけです。
 */
export type PlaceOrderFormState = ActionState<void>;
