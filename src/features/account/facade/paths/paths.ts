/**
 * この feature が持つルートのうち、他の feature が指すもの。
 *
 * @remarks
 * `facade` へ置くのは、購入手続き（`checkout`）がここを指すためです。feature どうしは直接 import
 * できず、公開する口だけをここへ出します。指す側が宛先を書き写すと、ルートを変えたときに古い
 * 宛先が残ります。
 */

/** マイページ。global nav が直接指す。 */
export const MYPAGE_PATH = "/mypage";

/** プロフィール編集。マイページの下の階層に置く。 */
export const PROFILE_EDIT_PATH = "/mypage/edit";
