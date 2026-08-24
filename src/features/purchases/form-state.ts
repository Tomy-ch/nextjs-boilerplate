import type { ActionState } from "@/model/action-state";

/**
 * 購入の状態を進めた結果。
 *
 * @remarks
 * 成功値を持ちません。進んだあとの購入は画面が取り直すので、結果に載せて運ぶものがありません。
 */
export type PurchaseTransitionState = ActionState<undefined>;

/** 対象が送られてこなかったときの文言。 */
export const TRANSITION_TARGET_LOST_MESSAGE = "対象の購入が判りません。画面を開き直してください。";

/**
 * キャンセルが状態で拒まれたときの文言。
 *
 * @remarks
 * カタログの既定文言は分類だけを伝えるもので、拒まれた理由が「読み込んでからの間に購入が進んだ」
 * ことであるのは、この画面でしか言えません。
 */
export const CANCEL_CONFLICT_MESSAGE =
  "いまの状況ではキャンセルできません。読み込んでからの間に購入が進んだか、すでにキャンセル済みです。";

/** 支払いが状態で拒まれたときの文言。理由の在処は {@link CANCEL_CONFLICT_MESSAGE} と同じ。 */
export const PAY_CONFLICT_MESSAGE =
  "いまの状況では支払えません。読み込んでからの間に購入が進んだか、すでに支払い済みです。";
