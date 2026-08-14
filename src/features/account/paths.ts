/** マイページ。global nav が直接指す。 */
export const MYPAGE_PATH = "/mypage";

/** プロフィール編集。マイページの下の階層に置く。 */
export const PROFILE_EDIT_PATH = "/mypage/edit";

/**
 * 購入履歴。
 *
 * @remarks
 * 画面はまだ無く、global nav と同じ宛先を指しています。範囲を絞って読む操作はその画面が持つ
 * ため、集計の詳細から先はここへ送ります。
 */
export const PURCHASE_HISTORY_PATH = "/purchases";
