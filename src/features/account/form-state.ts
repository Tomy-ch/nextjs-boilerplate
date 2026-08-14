import type { ActionState } from "@/model/action-state";
import type { ProfileField } from "@/model/user/profile-schema";

/**
 * プロフィール編集フォームの結果。
 *
 * @remarks
 * 成功値を持たないのは、更新後の内容が画面の入力欄にそのまま残っているためです。返しても
 * 同じものが 2 か所に出るだけです。
 */
export type ProfileFormState = ActionState<void, ProfileField>;

/**
 * 退会の結果。
 *
 * @remarks
 * 成功したときの状態は画面に現れません。成立した時点で別の画面へ送るためです。ここに現れるのは
 * 失敗だけになります。
 */
export type WithdrawFormState = ActionState<void>;
