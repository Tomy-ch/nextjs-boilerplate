/**
 * 発行された session を、ブラウザへ置ける形へ組み直す。
 *
 * @remarks
 * 入口（[`index.ts`](index.ts)）から切り出してあります。発行そのものは応答を待つ遣り取りですが、
 * 返ってきた `Set-Cookie` から名前と値を取り出す部分は文字列だけで答えが出るためです。
 *
 * **ここが壊れると赤くなりません。** 置く cookie を取り違えると開くのはログイン画面ですが、
 * 計測は応答の成否を見ない（`--ignore-status-code`）ので、目的の画面ではない絵の数値が予算に
 * 収まって緑で通ります。検査が要るのはこの倒れ方のためです。
 */

/**
 * `Set-Cookie` の並びから、名前と値の組を取り出す。
 *
 * @param setCookies - 応答が返した `Set-Cookie` の全て。
 * @returns `[name, value]` の並び。
 *
 * @remarks
 * 属性（`Path` / `HttpOnly` / `Max-Age` など）は落とします。置き直すときの属性は置く側が決める
 * ものであり、発行した側の指示をそのまま持ち回ると、宛先の違う実行で効かない cookie ができます。
 *
 * 値に `=` を含む cookie があるため、名前と値を分けるのは最初の `=` だけです。同じ理由で、
 * 属性を切り落とすのに使うのは最初の `;` だけです。
 */
export function parseCookiePairs(setCookies: readonly string[]): [string, string][] {
  return setCookies.map((cookie) => {
    const pair = cookie.split(";")[0] ?? "";
    const at = pair.indexOf("=");

    return at === -1 ? [pair, ""] : [pair.slice(0, at), pair.slice(at + 1)];
  });
}
