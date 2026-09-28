/**
 * この feature が持つルートのうち、他の feature が指すもの。
 *
 * @remarks
 * `facade` へ置くのは、カート（`cart`）が購入手続きへ送る導線を持つためです。feature どうしは
 * 直接 import できず、公開する口だけをここへ出します。指す側が宛先を書き写すと、ルートを変えたときに
 * 古い宛先が残ります。
 */

/** 購入を確かめて確定する画面。認証の内側にある。 */
export const CHECKOUT_PATH = "/checkout";
