import type { ActionState } from "@/model/action-state";

import type { CLAIM_CODE_FIELD } from "./form-names";

/**
 * 受け取りが画面へ返す結果。
 *
 * @remarks
 * 成功しても返す値はありません。受け取った 1 枚は取り直した一覧に現れ、それは同じ往復で再描画
 * される Server Component が持ちます。
 */
export type ClaimCouponFormState = ActionState<void, typeof CLAIM_CODE_FIELD>;

/** コードが空のまま送ろうとしたときの文言。受け取り欄と Server Action が同じ文言を出す。 */
export const EMPTY_CODE_MESSAGE = "キャンペーンコードを入力してください。";
