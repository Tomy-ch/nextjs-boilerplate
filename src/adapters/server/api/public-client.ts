import "server-only";

import { getApiConfig } from "@/config/api/api.server";
import { getHttpConfig } from "@/config/http/http.server";

import { createHttpClient, type PublicHttpClient } from "../http/request";

let client: PublicHttpClient | undefined;

/**
 * 主体を名乗らずに引ける口が共有する接続先。
 *
 * @remarks
 * retry budget と circuit breaker は client の中に状態として載ります。同じ downstream へ別々の
 * client を持つと、劣化したかどうかの判断がその数だけ分かれ、どれも全体を見ないまま叩き続けます
 * （[0071](../../../../docs/adr/0071-bff-api-integration.md) の per-downstream）。**寄せてあるのは公開の口
 * だけです** —— user-scoped 側の扱いは [adapters](../../README.md) の同じ節が持ちます。
 *
 * **`use cache` を持つモジュールはここから引きます。** `createHttpClient` を直に引くと、その
 * モジュールは user-scoped な client も組める状態になり、
 * `project-rules/no-user-scoped-in-cached-module` が止めます
 * （[0112](../../../../docs/adr/0112-data-classification-cache-boundary.md) 決定 4 の段 2）。
 * このモジュールが作れるのは公開の client だけなので、引く側は分類を取り違えようがありません。
 */
export function getPublicClient(): PublicHttpClient {
  client ??= createHttpClient({
    scope: "public",
    baseUrl: getApiConfig().baseUrl,
    maxUrlBytes: getHttpConfig().maxUrlBytes,
  });

  return client;
}
