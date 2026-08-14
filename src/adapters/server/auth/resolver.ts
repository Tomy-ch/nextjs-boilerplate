import "server-only";

import { getAuthConfig } from "@/config/auth/auth.server";

import { createDefaultSessionResolver } from "./default-session-resolver";
import type { SessionResolver } from "./session-resolver";

let resolver: SessionResolver | undefined;

/**
 * 同梱している既定 Resolver を返す。
 *
 * @remarks
 * fork 先が認証方式を替えるときに差し替えるのはこの 1 か所です。呼び出し側は
 * `SessionResolver` の面しか知らないため、ここを書き換えても他は動きません。
 *
 * cookie を触る側（`session.ts`）と入口の楽観判定（`optimistic-session.ts`）の両方から使うため、
 * どちらにも寄せずに独立させています。片方へ置くと、もう片方が `next/headers` のような
 * 実行文脈まで一緒に引き込みます。
 */
export function getSessionResolver(): SessionResolver {
  const config = getAuthConfig();

  resolver ??= createDefaultSessionResolver({
    issuer: config.issuer,
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    scopes: config.scopes,
    sessionSecret: config.sessionSecret,
  });

  return resolver;
}
