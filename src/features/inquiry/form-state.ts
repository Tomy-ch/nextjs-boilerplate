import type { ActionState } from "@/model/action-state";

import type { INQUIRY_BODY_FIELD } from "./form-names";

/**
 * 送信が画面へ返す結果。
 *
 * @remarks
 * 成功しても返す値はありません。送った 1 通は取り直した正本に現れ、それは同じ往復で再描画される
 * Server Component が持ちます。
 */
export type InquiryMessageActionState = ActionState<void, typeof INQUIRY_BODY_FIELD>;

/** 本文が空のまま送ろうとしたときの文言。送信欄と Server Action が同じ文言を出す。 */
export const EMPTY_BODY_MESSAGE = "本文を入力してください。";
