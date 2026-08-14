import "server-only";

import { base64url } from "jose";

/**
 * PKCE の検証子から challenge を組み立てる。
 *
 * @remarks
 * 変換方式は S256 だけを実装します。`plain` は検証子をそのまま送る方式で、認可要求を覗ける
 * 相手に検証子が渡るため PKCE の目的を失います（RFC 7636 §7.2）。IdP 側も S256 を必須強制して
 * いるため、選べる余地を残す意味もありません。
 *
 * @param verifier - `random-token.ts` が作った検証子
 */
export async function toCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));

  return base64url.encode(new Uint8Array(digest));
}
