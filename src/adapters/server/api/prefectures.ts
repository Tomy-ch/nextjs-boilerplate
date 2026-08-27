import "server-only";

import { cache } from "react";
import type { z } from "zod";

import { getApiConfig } from "@/config/api/api.server";
import { getHttpConfig } from "@/config/http/http.server";
import type { Prefecture } from "@/model/user/user";

import { GetPrefecturesResponse } from "../../gen/api/endpoints.zod";
import { createHttpClient, type HttpClient } from "../http/request";

type WirePrefectures = z.infer<typeof GetPrefecturesResponse>;

/**
 * 都道府県マスタのキャッシュタグ。
 *
 * @remarks
 * 商品のマスタとは別のタグにしてあります。片方を無効化したときに、変わっていないもう片方まで
 * 取り直す理由がありません。
 */
export const PREFECTURE_MASTERS_TAG = "prefecture-masters";

let client: HttpClient | undefined;

function getClient(): HttpClient {
  client ??= createHttpClient({
    baseUrl: getApiConfig().baseUrl,
    maxUrlBytes: getHttpConfig().maxUrlBytes,
  });

  return client;
}

/**
 * マスタの応答を表示用の型へ写す。
 *
 * @remarks
 * `code` は落とします。並び順を決めるための番号であり、契約が `code` 昇順で返すと定めている
 * ため、受け取った順序がそのまま表示の順序になります。
 */
function toPrefectures(wire: WirePrefectures): readonly Prefecture[] {
  return wire.map(({ id, name }) => ({ id, name }));
}

/**
 * 都道府県のマスタを取得する。
 *
 * @remarks
 * 認証を要しない公開の口です。クライアントに Bearer の取得口を渡していないのはそのためで、
 * 未ログインの画面からも同じ取得口を使えます。
 *
 * キャッシュを明示しているのは、都道府県が画面を開くたびに変わる種類のデータではないためです
 * （[0040](../../../../docs/adr/0040-routing-rendering-strategy.md)）。
 */
export const getPrefectures = cache(async (): Promise<readonly Prefecture[]> => {
  const prefectures = await getClient().request({
    path: "/v1/prefectures",
    schema: GetPrefecturesResponse,
    cache: "force-cache",
    tags: [PREFECTURE_MASTERS_TAG],
  });

  return toPrefectures(prefectures);
});
