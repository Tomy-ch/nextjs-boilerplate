import "server-only";

import { getApiConfig } from "@/config/api/api.server";
import { getHttpConfig } from "@/config/http/http.server";

import { getAccessToken } from "../auth/session";
import { createHttpClient, type UserScopedHttpClient } from "./request";

let client: UserScopedHttpClient | undefined;

/**
 * 主体に紐づくものを取る口が共有する接続先。
 *
 * @remarks
 * 1 つに寄せる理由（retry budget と circuit breaker の状態）は [adapters](../../README.md) の
 * "`use cache` is what persists across requests" が持ちます。
 *
 * **資格情報が取れなくても送ってよい要求には、呼ぶ側が `allowAnonymous` を立てます。** 立ててよいのは
 * 契約が認証を任意と宣言した operation だけで、判断の仕方は同じ README の
 * "The connection point decides whether credentials are attached; the request decides whether
 * sending is allowed" が持ちます。
 *
 * @returns user-scoped の口が共有する client
 */
export function getUserScopedClient(): UserScopedHttpClient {
  client ??= createHttpClient({
    scope: "user-scoped",
    baseUrl: getApiConfig().baseUrl,
    maxUrlBytes: getHttpConfig().maxUrlBytes,
    getBearerToken: getAccessToken,
  });

  return client;
}
