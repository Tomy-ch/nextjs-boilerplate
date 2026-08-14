// 配色の意味トークンの名前を、生成した CSS から取り出す。
//
// 値は持たない。SSOT から生成物までは `tokens-drift` が見ているので、ここで値を持つと同じ表を
// 2 箇所に持つことになる。名前だけを取り、実ブラウザで読んだ結果の突き合わせに使う。

/** 意味トークンの別名の宣言。primitive(`--color-neutral-100: #ededed`)とはこの形で分かれる。 */
const SEMANTIC_ALIAS = /^\s*(--color-[a-z0-9-]+):\s*var\(--semantic-color-[a-z0-9-]+\);/gm;

/**
 * 継承する色を変えた 2 つの面で読んだ、同じトークンの解決結果。
 *
 * @remarks
 * 2 面で読むのは、宣言の無い custom property を使った宣言が「計算時に無効」となり、その
 * property が**継承値へ落ちる**ためです。継承値も色として読めるので、1 面だけでは届いた色と
 * 継承した色を区別できません。届いていれば継承元が何であれ同じ色が返ります。
 */
export type TokenReadings = readonly [string, string];

/**
 * 生成した CSS から配色の意味トークンの名前を取り出す。
 *
 * @remarks
 * 1 つも見つからなければ例外を投げます。0 件へ縮退させると、検査する対象が無い状態が
 * 「すべて届いている」として緑で通ります。
 */
export function semanticColorTokens(css: string): string[] {
  const names = [...css.matchAll(SEMANTIC_ALIAS)].map(([, name]) => name as string).sort();
  if (names.length === 0) throw new Error("配色の意味トークンが 1 つも見つかりません");

  return names;
}
