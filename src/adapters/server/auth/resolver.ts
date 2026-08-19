import "server-only";

import { getAuthConfig } from "@/config/auth/auth.server";
import { getHttpConfig } from "@/config/http/http.server";

import { fetchSessionRole } from "../api/user-roles"; // sample:line
import { createDefaultSessionResolver } from "./default-session-resolver";
import type { SessionResolver } from "./session-resolver";

let resolver: SessionResolver | undefined;

/**
 * 同梱している既定 Resolver を返す。
 *
 * @remarks
 * fork 先の差し替え単位は `SessionResolver` です（[README](./README.md) の「差し替え点」）。
 *
 * cookie を触る側（`session.ts`）と入口の楽観判定（`optimistic-session.ts`）の両方から使うため、
 * どちらにも寄せずに独立させています。片方へ置くと、もう片方が `next/headers` のような
 * 実行文脈まで一緒に引き込みます。
 *
 * 一度作った Resolver を使い回します。呼ぶたびに作り直すと、Resolver が抱える Discovery と
 * 鍵の取得結果も毎回捨てることになります。
 */
export function getSessionResolver(): SessionResolver {
  const config = getAuthConfig();

  resolver ??= createDefaultSessionResolver({
    issuer: config.issuer,
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    scopes: config.scopes,
    sessionSecret: config.sessionSecret,
    maxUrlBytes: getHttpConfig().maxUrlBytes,
    resolveRole: fetchSessionRole, // sample:line
  });

  return resolver;
}
