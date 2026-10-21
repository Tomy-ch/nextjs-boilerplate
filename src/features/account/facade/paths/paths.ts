/**
 * この feature が持つルートのうち、他の feature が指すもの。
 *
 * @remarks
 * `facade` へ置くのは、購入手続き（`checkout`）がここを指すためです。
 */

/** マイページ。global nav が直接指す。 */
export const MYPAGE_PATH = "/mypage";

/** プロフィール編集。 */
export const PROFILE_EDIT_PATH = "/mypage/edit";
