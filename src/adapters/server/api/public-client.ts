import "server-only";

import { getApiConfig } from "@/config/api/api.server";
import { getHttpConfig } from "@/config/http/http.server";

import { createHttpClient, type PublicHttpClient } from "../http/request";

let client: PublicHttpClient | undefined;

/**
 * 主体を名乗らずに引ける口が共有する接続先。
 *
 * @remarks
 * **公開の口はここを引き、`createHttpClient` を直に引きません。** 1 つに寄せる理由（retry budget と
 * circuit breaker の状態）と、user-scoped 側がまだ寄っていないことは
 * [adapters](../../README.md) の「リクエストをまたいで残すのは `use cache` の側」が持ちます。
 *
 * **このモジュールが作れるのは公開の client だけです。** それが、`use cache` を持つモジュールがここを
 * 経由できる理由そのものです —— 直に引けるモジュールは user-scoped な client も組める状態にあり、
 * `project-rules/no-user-scoped-in-cached-module` が落とします。
 */
export function getPublicClient(): PublicHttpClient {
  client ??= createHttpClient({
    scope: "public",
    baseUrl: getApiConfig().baseUrl,
    maxUrlBytes: getHttpConfig().maxUrlBytes,
  });

  return client;
}
