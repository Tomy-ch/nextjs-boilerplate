import "server-only";

import { z } from "zod";

import { getAuthConfig } from "@/config/auth/auth.server";

/**
 * cookie 名の接頭辞。
 *
 * @remarks
 * 用途を名前に含めるのは、ブラウザの一覧を見た人が何の cookie か辿れるようにするためです
 * （`docs/rules.md` #44）。`auth` は BFF が認証のために置くものを指します。
 */
const PREFIX = "auth";

/** 封緘した session を載せる cookie の名前。 */
export const SESSION_COOKIE_NAME = `${PREFIX}_session`;

/** 認可要求の往復で一時状態を載せる cookie の名前。 */
export const TRANSACTION_COOKIE_NAME = `${PREFIX}_tx`;

/**
 * 認可要求の一時状態が生きる秒数。
 *
 * @remarks
 * IdP の画面で利用者が入力を終えるまでの猶予です。長く取ると、離脱した認可要求の一時状態が
 * ブラウザに残り続けます。
 */
export const TRANSACTION_MAX_AGE_SECONDS = 600;

/**
 * cookie に共通で付ける属性。
 *
 * @remarks
 * `httpOnly` は client-side JS からの読み出しを塞ぎ、XSS 起点の session 窃取を緩和します。
 * `sameSite: "lax"` は他サイトからの POST に cookie を載せない一方、IdP からのリダイレクト
 * （トップレベルの GET ナビゲーション）では送出されます。`strict` にすると callback で
 * cookie が届かず、認証が成立しません。
 *
 * `secure` は自分が https で配信されているときだけ付けます。常に付けると `http://localhost` の
 * 開発で cookie が保存されず、逆に常に外すと本番で平文の経路に載ります。判定には設定の
 * callback URL を使います。あれは IdP がブラウザを戻す先、すなわち**自分の origin** であり、
 * 環境の種類を別の変数で持たずに scheme を知れる唯一の既存の値です。
 */
export function baseCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
} {
  return {
    httpOnly: true,
    secure: new URL(getAuthConfig().redirectUri).protocol === "https:",
    sameSite: "lax",
    path: "/",
  };
}

/** 一時状態の cookie に載せる形。 */
const TransactionCookie = z.object({
  state: z.string(),
  codeVerifier: z.string(),
  nonce: z.string(),
  returnUrl: z.string(),
});

/**
 * 一時状態の cookie 値を読み取る。
 *
 * @remarks
 * 一時状態は封緘しません。ここにあるのは認可コードと組み合わせて初めて意味を持つ値であり、
 * 単体では session になりません。逆に、形が壊れていれば認可要求の続きとして扱えないため、
 * 解釈できない値は `null` にして往復をやり直させます。
 *
 * @param raw - cookie に入っていた文字列
 * @returns 解釈できなければ null
 */
export function parseTransactionCookie(
  raw: string | undefined,
): z.infer<typeof TransactionCookie> | null {
  if (raw === undefined) {
    return null;
  }

  try {
    return TransactionCookie.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}
