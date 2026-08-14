/** 復帰先が無いときに送る先。 */
const FALLBACK_RETURN_URL = "/";

/**
 * 未認証で弾いた利用者を、認証後に戻す先を検証する。
 *
 * @remarks
 * 受け取った値をそのままリダイレクト先にすると、攻撃者の用意した URL へ自サイトの導線で送れて
 * しまいます（open redirect）。同一 origin の相対パスだけを通し、それ以外は既定の行き先へ倒します
 * （[0079](../../docs/adr/0079-auth-frontend-seam.md)）。
 *
 * `//example.com` と `/\example.com` を弾くのは、どちらもブラウザが protocol-relative URL として
 * 解釈し、先頭が `/` であるという見た目の検査を通り抜けるためです。`http://` のような scheme 付きも
 * 同様に弾きます。
 *
 * 判定は「通す形を列挙する」側で書いています。危険な形を数え上げる書き方は、数え漏らした形が
 * 黙って通ります。
 *
 * @param candidate - クエリ等から受け取った復帰先候補
 * @returns 安全と判定した相対パス。判定に落ちたときは `/`
 */
export function toSafeReturnUrl(candidate: string | null | undefined): string {
  if (candidate === null || candidate === undefined || candidate === "") {
    return FALLBACK_RETURN_URL;
  }

  if (!candidate.startsWith("/")) {
    return FALLBACK_RETURN_URL;
  }

  // 2 文字目が `/` または `\` なら、ブラウザは別 origin として解決する。
  const second = candidate.charAt(1);
  if (second === "/" || second === "\\") {
    return FALLBACK_RETURN_URL;
  }

  return candidate;
}
