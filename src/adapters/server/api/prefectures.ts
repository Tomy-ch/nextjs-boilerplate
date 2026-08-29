import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import type { z } from "zod";

import type { Prefecture } from "@/model/user/user";

import { GetPrefecturesResponse } from "../../gen/api/endpoints.zod";
import { getPublicClient } from "./public-client";

type WirePrefectures = z.infer<typeof GetPrefecturesResponse>;

/**
 * 都道府県マスタのキャッシュタグ。
 *
 * @remarks
 * 商品のマスタとは別のタグにしてあります。片方を無効化したときに、変わっていないもう片方まで
 * 取り直す理由がありません。
 */
export const PREFECTURE_MASTERS_TAG = "prefecture-masters";

/**
 * 都道府県マスタの寿命。
 *
 * @remarks
 * 行政区画は数年から数十年に一度しか変わりません。商品マスタと別の profile を選ぶのはこの差の
 * ためで、同じ「マスタ」でも古さの許容が違います。
 *
 * 商品マスタと同じく、このリポジトリから更新する経路はありません
 * （`product-masters.ts` の寿命の項）。
 */
const PREFECTURE_MASTERS_LIFE = "max";

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
 * 都道府県は画面を開くたびに変わる種類のデータではないので、リクエストをまたいで残します
 * （[0071](../../../../docs/adr/0071-bff-api-integration.md)）。寿命は
 * {@link PREFECTURE_MASTERS_LIFE}、捨てる印は {@link PREFECTURE_MASTERS_TAG} が持ちます。
 */
export const getPrefectures = cache(async (): Promise<readonly Prefecture[]> => {
  "use cache";
  cacheLife(PREFECTURE_MASTERS_LIFE);
  cacheTag(PREFECTURE_MASTERS_TAG);

  const prefectures = await getPublicClient().request({
    path: "/v1/prefectures",
    schema: GetPrefecturesResponse,
  });

  return toPrefectures(prefectures);
});
