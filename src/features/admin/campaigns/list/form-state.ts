import type { ActionState } from "@/model/action-state";

/**
 * 配布を停止した結果。
 *
 * @remarks
 * 成功値に対象のコードを持ちます。結果は一覧の上に 1 つだけ出すため、どの行に対する結果かを
 * 文言へ織り込む必要があります。
 */
export type SuspendCampaignState = ActionState<{ readonly code: string }>;

/**
 * キャンペーンの配布を停止する送信先。
 *
 * @remarks
 * **この画面は送信先を自分で決めません。** 役割の確認は `adapters/server/auth` の領分で、そこへ
 * 触れてよいのは app 層です。したがって送信先は route が渡します。
 */
export type SuspendCampaignAction = (
  state: SuspendCampaignState,
  formData: FormData,
) => Promise<SuspendCampaignState>;

/** 対象か冪等キーが送られてこなかったときの文言。 */
export const SUSPEND_TARGET_LOST_MESSAGE =
  "対象のキャンペーンが判りません。画面を開き直してください。";

/** 既に停止されていて拒まれたときの文言。コードの後ろに続ける。 */
export const SUSPEND_CONFLICT_MESSAGE = "すでに停止されています。一覧を最新の状態に更新しました。";
