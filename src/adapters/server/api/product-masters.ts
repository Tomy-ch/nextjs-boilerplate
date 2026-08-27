import "server-only";

import { cache } from "react";
import type { z } from "zod";

import { getApiConfig } from "@/config/api/api.server";
import { getHttpConfig } from "@/config/http/http.server";
import type { ProductCategory, ProductStatus } from "@/model/product/product";

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
  client ??= createHttpClient({
    baseUrl: getApiConfig().baseUrl,
    maxUrlBytes: getHttpConfig().maxUrlBytes,
  });

  return client;
}

/**
 * マスタの応答を表示用の分類へ写す。
 *
 * @remarks
 * 並び替えの値を持ちません。契約が表示順の昇順で返すと定めているため、受け取った順序がそのまま
 * 表示の順序になります。
 *
 * `code` は残します。分類で絞り込む条件として URL に載るのはこの番号だからです。
 */
function toProductCategories(wire: WireCategories): readonly ProductCategory[] {
  return wire.map(({ id, name, code }) => ({ id, name, code }));
}

/**
 * 商品カテゴリのマスタを取得する。
 *
 * @remarks
 * キャッシュを明示しているのは、分類が画面を開くたびに変わる種類のデータではないためです
 * （[0040](../../../../docs/adr/0040-routing-rendering-strategy.md)）。更新はタグの無効化で反映します。
 */
export const getProductCategories = cache(async (): Promise<readonly ProductCategory[]> => {
  const categories = await getClient().request({
    path: "/v1/products/categories",
    schema: GetProductCategoriesResponse,
    cache: "force-cache",
    tags: [PRODUCT_MASTERS_TAG],
  });

  return toProductCategories(categories);
});

/**
 * マスタの応答を表示用の状態へ写す。
 *
 * @remarks
 * `code` を残す理由は {@link toProductCategories} と同じです。
 */
function toProductStatuses(wire: WireStatuses): readonly ProductStatus[] {
  return wire.map(({ id, name, code }) => ({ id, name, code }));
}

/**
 * 商品ステータスのマスタを取得する。
 *
 * @remarks
 * キャッシュの扱いは {@link getProductCategories} と同じです。
 */
export const getProductStatuses = cache(async (): Promise<readonly ProductStatus[]> => {
  const statuses = await getClient().request({
    path: "/v1/products/statuses",
    schema: GetProductStatusesResponse,
    cache: "force-cache",
    tags: [PRODUCT_MASTERS_TAG],
  });

  return toProductStatuses(statuses);
});
