import type { ActionState } from "@/model/action-state";

/**
 * 退会させた結果。
 *
 * @remarks
 * 成功値に対象の呼び名を持ちます。一覧の上に結果を出すため、どの行に対する結果かを文言へ
 * 織り込む必要があり、**成立した時点でその行は一覧から消えている**ことがあるからです
 * （「有効」で絞り込んでいるとき）。
 */
export type WithdrawUserState = ActionState<{ readonly name: string }>;

/**
 * 利用者を退会させる送信先。
 *
 * @remarks
 * **この画面は送信先を自分で決めません。** 役割の確認は `adapters/server/auth` の領分で、そこへ
 * 触れてよいのは app 層です（`architecture.ts` の `adapters-auth`）。したがって送信先は route が
 * 渡します。
 */
export type WithdrawUserAction = (
  state: WithdrawUserState,
  formData: FormData,
) => Promise<WithdrawUserState>;

/** 退会の送信が持つ項目の名前。 */
export const WITHDRAW_FORM_NAMES = {
  /** 退会させる利用者。 */
  userId: "userId",
  /** 結果の文言に使う呼び名。 */
  userName: "userName",
} as const;

/** 対象が送られてこなかったときの文言。 */
export const WITHDRAW_TARGET_LOST_MESSAGE = "対象の利用者が判りません。画面を開き直してください。";

/** 進行中の購入が残って拒まれたときの文言。 */
export const WITHDRAW_CONFLICT_MESSAGE =
  "進行中の購入が残っているため退会させられません。購入が終わるか取り消されてから、もう一度お試しください。";
