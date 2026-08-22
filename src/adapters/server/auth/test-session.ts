import "server-only";

import { cookies } from "next/headers";

import type { SessionRole } from "@/model/session";
import { storeSession } from "./session";
import { SESSION_COOKIE_NAME } from "./session-cookie";

/**
 * テスト用の session を発行する。
 *
 * @remarks
 * 実在の IdP を通さずに「ログイン済み」へ到達させる口です。**本番で開いてはならない**ため、
 * 開ける環境の判定は呼び出し側（Route Handler）が持ちます。ここが持つのは、その状態を
 * どう組み立てるかだけです。
 *
 * 組み立てをこの層に置くのは、`SessionRecord` の形を `adapters/server` の外へ出さないためです。
 * Route Handler が形を知っていると、封緘対象が変わるたびに層をまたいで追随修正が要ります。
 *
 * 既定で発行するトークンは本物ではありません。この口が開く環境では API 自体がモックされており、
 * Bearer が検証される先がないためです。**実物の API へ繋ぐときだけ `accessToken` を渡します** —
 * 検証する先があるなら、そこを通るトークンでなければ意味がありません。
 */
export async function issueTestSession(input: {
  /** 誰として振る舞うか。 */
  readonly subject: string;
  /** 与える役割。 */
  readonly role: SessionRole;
  /** 失効までの秒数。 */
  readonly expiresInSeconds: number;
  /** API へ載せる Bearer。省略すると検証されない前提の値を組み立てる。 */
  readonly accessToken?: string;
}): Promise<void> {
  await storeSession({
    session: {
      userId: input.subject,
      role: input.role,
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
    },
    accessToken: input.accessToken ?? `test-access-token:${input.subject}`,
    idToken: `test-id-token:${input.subject}`,
  });
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
