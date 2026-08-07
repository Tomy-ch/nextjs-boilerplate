import "server-only";

import { cache } from "react";
import type { z } from "zod";

import { getApiConfig } from "@/config/api/api.server";
import type { Product, ProductPage } from "@/model/product/product";

import { GetProductsResponse } from "../../gen/api/endpoints.zod";
import { createHttpClient, type HttpClient } from "../http/request";

/** 商品一覧の取得条件。契約のクエリと 1 対 1 に対応する。 */
export type ProductQuery = {
  after?: string;
  first?: number;
  categoryId?: string;
  keyword?: string;
  sort?: string;
};

type WireProductPage = z.infer<typeof GetProductsResponse>;
type WireProduct = WireProductPage["products"][number];

/** 商品一覧のキャッシュタグ。ミューテーション後の再検証はこのタグを無効化する。 */
export const PRODUCTS_TAG = "products";

let client: HttpClient | undefined;

function getClient(): HttpClient {
  client ??= createHttpClient({ baseUrl: getApiConfig().baseUrl });

  return client;
}

/**
 * 契約の商品を表示用の型へ写す。
 *
 * @remarks
 * 変換をこの境界に閉じるのは、契約の形が変わったときに影響が及ぶ範囲をここまでに留めるためです。
 * 生成型をそのまま内層へ渡すと、契約の都合が画面の実装へ直接漏れます。
 */
export function toProduct(wire: WireProduct): Product {
  return {
    id: wire.id,
    name: wire.name,
    description: wire.description,
    price: wire.price,
    quantity: wire.quantity,
    status: { id: wire.status.id, name: wire.status.name },
    category: { id: wire.category.id, name: wire.category.name },
    publishedAt: wire.publishedAt === null ? null : new Date(wire.publishedAt),
    imagePath: wire.imagePath,
  };
}

/** 契約の 1 ページを表示用の型へ写す。 */
export function toProductPage(wire: WireProductPage): ProductPage {
  return {
    products: wire.products.map(toProduct),
    nextCursor: wire.nextCursor,
  };
}

/**
 * 商品一覧を取得する。
 *
 * @remarks
 * 同一レンダリング内の重複呼び出しは `cache()` がまとめます。呼び出し側に「1 回だけ呼ぶ」
 * 規律を要求すると、画面を組み替えるたびに取得の回数が変わってしまうためです。
 */
export const getProducts = cache(async (query: ProductQuery = {}): Promise<ProductPage> => {
  const page = await getClient().request({
    path: "/v1/products",
    searchParams: {
      after: query.after,
      first: query.first?.toString(),
      categoryId: query.categoryId,
      keyword: query.keyword,
      sort: query.sort,
    },
    schema: GetProductsResponse,
    tags: [PRODUCTS_TAG],
  });

  return toProductPage(page);
});
