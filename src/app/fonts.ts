import { Geist_Mono, IBM_Plex_Sans_JP, LINE_Seed_JP, Michroma } from "next/font/google";

/**
 * 銘に使う書体。ラテンの字しか持たないため、和文を含む文字列には当てない。
 *
 * @remarks
 * 当てると和文だけが次の書体へ落ち、1 つの語の中で書体が変わります。用途はサイト名のような
 * ラテンの銘に限ります。
 */
const brand = Michroma({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--typeface-michroma",
});

/**
 * 利用者向けの面の本文書体。
 *
 * @remarks
 * 持っている太さは 100 / 400 / 700 / 800 で、**500 と 600 がありません**。読み込む段を強調の
 * token（700 / 800）に合わせてあるので丸めは起きません。丸められるのは、この書体が持たない
 * 段を直書きしたとき（`font-medium` / `font-semibold`）です。
 */
const ui = LINE_Seed_JP({
  weight: ["400", "700", "800"],
  subsets: ["latin"],
  display: "swap",
  variable: "--typeface-line-seed",
});

/**
 * 管理向けの面の本文書体。
 *
 * @remarks
 * 先読みしません。管理画面に入るまで要らない書体で、和文の字形は容量が大きいためです。
 */
const admin = IBM_Plex_Sans_JP({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--typeface-plex-jp",
});

/** 等幅。 */
const mono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--typeface-geist-mono",
});

/**
 * 書体の CSS 変数を配る class 名。
 *
 * @remarks
 * `next/font` は変数の宣言を class に載せるため、変数を読む要素の祖先に必ずこの class が要ります。
 * 実アプリの `<html>` とカタログの story 双方から同じ定義を使うために切り出しています。
 */
export const FONT_VARIABLES = [brand.variable, ui.variable, admin.variable, mono.variable].join(
  " ",
);
