/**
 * 発行された session を、要求へ載せる形へ組み直す。
 *
 * @remarks
 * 入口（[`index.ts`](index.ts)）から切り出してあります。発行そのものは応答を待つ遣り取りですが、
 * 返ってきた `Set-Cookie` から `Cookie` を組む部分は文字列だけで答えが出るためです。
 *
 * **ここが壊れると赤くなりません。** 送る cookie を取り違えると開くのはログイン画面ですが、
 * 計測は応答の成否を見ない（`--ignore-status-code`）ので、目的の画面ではない絵の数値が予算に
 * 収まって緑で通ります。検査が要るのはこの倒れ方のためです。
 */

/**
 * `Set-Cookie` の並びを `Cookie` ヘッダの値へ組み直す。
 *
 * @param setCookies - 応答が返した `Set-Cookie` の全て。
 * @returns `name=value` を `; ` で連ねた値。
 *
 * @remarks
 * 属性（`Path` / `HttpOnly` / `Max-Age` など）は落とします。`Cookie` ヘッダが運ぶのは名前と値
 * だけで、属性は発行する側から受け取る側への指示だからです。
 *
 * 値に `=` を含む cookie があるため、区切りに使うのは最初の `;` だけです。
 */
export function buildCookieHeader(setCookies: readonly string[]): string {
  return setCookies.map((cookie) => cookie.split(";")[0]).join("; ");
}
