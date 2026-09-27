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
 * **user-scoped の口はここを引き、`createHttpClient` を直に引きません。** 1 つに寄せる理由（retry
 * budget と circuit breaker の状態）は [adapters](../../README.md) の「リクエストをまたいで残すのは
 * `use cache` の側」が持ちます。
 *
 * **資格情報の取得口を渡すのはここだけです。** 取得口は要求のたびに session から解決され、この
 * client は資格情報を保持しません。認証を任意にしてよいかは operation ごとに決まるので、要求の
 * `allowAnonymous` で宣言します。
 *
 * **分類は `user-scoped` で、キャッシュの指定は型として渡せません**（`docs/rules.md`「データ分類と
 * 機微情報」の「取得の口は分類を宣言する」）。
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
