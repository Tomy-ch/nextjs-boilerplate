import type { ActionState } from "@/model/action-state";
import type { ProfileField } from "@/model/user/profile-schema";

/**
 * プロフィール入力フォームの結果。編集と登録の双方が使う。
 *
 * @remarks
 * 成功値を持たないのは、送った内容が画面の入力欄にそのまま残っているためです。返しても同じ
 * ものが 2 か所に出るだけで、登録のほうは成立した時点で別の画面へ移ります。
 *
 * 項目エラーの鍵が同じなのは、両者が同じ 9 項目を同じスキーマで検証するからです
 * （`model/user/profile-schema.ts`）。
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
