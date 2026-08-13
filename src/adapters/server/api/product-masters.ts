import "server-only";

import { cache } from "react";
import type { z } from "zod";

import { getApiConfig } from "@/config/api/api.server";
import type { ProductRef } from "@/model/product/product";

import {
  GetProductCategoriesResponse,
  GetProductStatusesResponse,
} from "../../gen/api/endpoints.zod";
import { createHttpClient, type HttpClient } from "../http/request";

type WireCategories = z.infer<typeof GetProductCategoriesResponse>;
type WireStatuses = z.infer<typeof GetProductStatusesResponse>;

/**
 * 商品マスタのキャッシュタグ。
 *
 * @remarks
 * 商品そのものとは別のタグにしてあります。商品を 1 件更新するたびに分類の一覧まで取り直すのは、
 * 変わっていないものを捨てているだけです。
 */
export const PRODUCT_MASTERS_TAG = "product-masters";

let client: HttpClient | undefined;

function getClient(): HttpClient {
  client ??= createHttpClient({ baseUrl: getApiConfig().baseUrl });

  return client;
}

/**
 * マスタの応答を表示用の参照へ写す。
 *
 * @remarks
 * `code` と `sortKey` は落とします。前者は backend の識別用の番号で、後者は並び順を決めるための
 * 値です。並びは契約が `sortKey` 昇順で返すと定めているため、受け取った順序がそのまま表示の順序に
 * なり、表示側が持ち直す理由がありません。
 */
function toProductRefs(wire: WireCategories | WireStatuses): readonly ProductRef[] {
  return wire.map(({ id, name }) => ({ id, name }));
}

/**
 * 商品カテゴリのマスタを取得する。
 *
 * @remarks
 * キャッシュを明示しているのは、分類が画面を開くたびに変わる種類のデータではないためです
 * （[0040](../../../../docs/adr/0040-routing-rendering-strategy.md)）。更新はタグの無効化で反映します。
 */
export const getProductCategories = cache(async (): Promise<readonly ProductRef[]> => {
  const categories = await getClient().request({
    path: "/v1/products/categories",
    schema: GetProductCategoriesResponse,
    cache: "force-cache",
    tags: [PRODUCT_MASTERS_TAG],
  });

  return toProductRefs(categories);
});

/** 商品ステータスのマスタを取得する。キャッシュの扱いはカテゴリと同じ。 */
export const getProductStatuses = cache(async (): Promise<readonly ProductRef[]> => {
  const statuses = await getClient().request({
    path: "/v1/products/statuses",
    schema: GetProductStatusesResponse,
    cache: "force-cache",
    tags: [PRODUCT_MASTERS_TAG],
  });

  return toProductRefs(statuses);
});
