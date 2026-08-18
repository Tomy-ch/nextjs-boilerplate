import "server-only";

import { cache } from "react";
import type { z } from "zod";

import { getApiConfig } from "@/config/api/api.server";
import type { ProductCategory } from "@/model/product/product";

import { GetProductCategoriesResponse } from "../../gen/api/endpoints.zod";
import { createHttpClient, type HttpClient } from "../http/request";

type WireCategories = z.infer<typeof GetProductCategoriesResponse>;

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
 * マスタの応答を表示用の分類へ写す。
 *
 * @remarks
 * `displaySort` は落とします。並び順を決めるための値であり、契約が `displaySort` 昇順で返すと
 * 定めているため、受け取った順序がそのまま表示の順序になります。
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
