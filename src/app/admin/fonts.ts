import { IBM_Plex_Sans_JP } from "next/font/google";

/**
 * 管理向けの面の本文書体。
 *
 * @remarks
 * **利用者向けの面と分けて宣言します。** 和文書体は Google が番号付きのスライスで配るため、
 * `next/font` が書き出す `@font-face` は 1 ウェイトあたり 100 を超えます。root layout が読むと、
 * その宣言が描画をブロックする CSS として全ページに載ります —— 使うのは `[data-surface="admin"]`
 * の下だけなのに、`not-found` を開くだけで読まされる状態でした。
 *
 * 先読みもしません。`subsets` が絞れるのは名前付きサブセットだけで、和文には効きません。
 */
const admin = IBM_Plex_Sans_JP({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--typeface-plex-jp",
});

/** 管理の面へ書体の変数を配る class 名。 */
export const ADMIN_FONT_VARIABLE = admin.variable;
