import "server-only";

import { cookies } from "next/headers";

import { storeSession } from "./session";
import { SESSION_COOKIE_NAME } from "./session-cookie";
import { type TestSessionSpec, toTestSessionRecord } from "./test-session-record";

/**
 * テスト用の session を発行する。
 *
 * @remarks
 * 実在の IdP を通さずに「ログイン済み」へ到達させる口です。**本番で開いてはならない**ため、
 * 開ける環境の判定は呼び出し側（Server Action）が持ちます。ここが持つのは、組み立てたものを
 * cookie へ載せることだけです。
 *
 * 認可の往復を通す経路（`AUTH_MODE=dev`）はここを通りません。あちらは `/api/auth/callback` が
 * session を置くため、組み立てだけを {@link toTestSessionRecord} から借ります。
 */
export async function issueTestSession(spec: TestSessionSpec): Promise<void> {
  await storeSession(toTestSessionRecord(spec));
}

/**
 * テスト用に発行した session を捨てる。
 *
 * @remarks
 * cookie を消すだけで、IdP へは向かいません。この session は IdP を通さずに作ったもので、
 * 終わらせる相手が居ないためです（通常のログアウトは、`signOut()` が返す先へ利用者を送って
 * IdP 側も終わらせます）。
 */
export async function discardTestSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}
