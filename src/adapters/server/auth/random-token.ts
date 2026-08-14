import "server-only";

import { base64url } from "jose";

/**
 * 生成する乱数のバイト数。
 *
 * @remarks
 * 32 バイトは base64url で 43 文字になり、PKCE 検証子の許容長（43〜128 文字、RFC 7636 §4.1）の
 * 下限をちょうど満たします。
 */
const TOKEN_BYTES = 32;

/**
 * 推測できない一意な値を作る。
 *
 * @remarks
 * PKCE の検証子・`state`・`nonce` はいずれも「攻撃者が事前に当てられないこと」だけを要求します。
 * 用途ごとに生成規則を分ける理由が無いため 1 つに寄せています。分けると、片方だけ弱い規則に
 * なっても気づけません。
 *
 * 乱数は Web Crypto から取ります。`Math.random` は予測可能であり、ここで使うと `state` の
 * 推測による認可コード注入を許します。
 */
export function createRandomToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);

  return base64url.encode(bytes);
}
