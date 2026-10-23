/**
 * この feature が持つルート。
 *
 * @remarks
 * `facade` へ置くのは、マイページ（`account`）がここへの導線を持つためです。feature どうしは
 * 直接 import できず、公開する口だけをここへ出します。指す側が宛先を書き写すと、ルートを変えた
 * ときに古い宛先が残ります。
 */

/** 保有クーポンの一覧と受け取り。マイページの下に置く。 */
export const COUPONS_PATH = "/mypage/coupons";
