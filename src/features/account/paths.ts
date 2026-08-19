/** マイページ。global nav が直接指す。 */
export const MYPAGE_PATH = "/mypage";

/** プロフィール編集。マイページの下の階層に置く。 */
export const PROFILE_EDIT_PATH = "/mypage/edit";

/**
 * 登録（オンボーディング）。
 *
 * @remarks
 * マイページの下ではなく認証の側に置きます。ここを通る利用者はまだ利用者の記録を持たず、
 * マイページを含む保護された画面のどれも開けないためです。
 */
export const ONBOARDING_PATH = "/onboarding";
