import "server-only";

import type { SessionRole } from "@/model/session";

import type { SessionRecord } from "./session-resolver";

/** IdP を通さずに発行する session の指定。 */
export type TestSessionSpec = {
  /** 誰として振る舞うか。 */
  readonly subject: string;
  /** 与える役割。 */
  readonly role: SessionRole;
  /** 失効までの秒数。 */
  readonly expiresInSeconds: number;
  /** API へ載せる Bearer。省略すると検証されない前提の値を組み立てる。 */
  readonly accessToken?: string;
};

/**
 * 指定から session を組み立てる。
 *
 * @remarks
 * 組み立てをこの層に置くのは、`SessionRecord` の形を `adapters/server` の外へ出さないためです。
 * Route Handler が形を知っていると、封緘対象が変わるたびに層をまたいで追随修正が要ります。
 *
 * **cookie を触る側とは別の module に置きます。** 組み立てだけを使う側（開発用 Resolver）が
 * `session.ts` を引くと、Resolver を選ぶ側との間に import の輪ができます。
 *
 * 既定で組むトークンは本物ではありません。この指定が通る環境では API 自体がモックされており、
 * Bearer が検証される先がないためです。**実物の API へ繋ぐときだけ `accessToken` を渡します** —
 * 検証する先があるなら、そこを通るトークンでなければ意味がありません。
 */
export function toTestSessionRecord(spec: TestSessionSpec): SessionRecord {
  return {
    session: {
      userId: spec.subject,
      role: spec.role,
      expiresAt: new Date(Date.now() + spec.expiresInSeconds * 1000),
    },
    accessToken: spec.accessToken ?? `test-access-token:${spec.subject}`,
    idToken: `test-id-token:${spec.subject}`,
  };
}
