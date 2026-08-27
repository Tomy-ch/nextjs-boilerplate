import { Geist_Mono, Michroma } from "next/font/google";

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
export const FONT_VARIABLES = [brand.variable, mono.variable].join(" ");
