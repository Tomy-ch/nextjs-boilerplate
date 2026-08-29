import "server-only";

import { getApiConfig } from "@/config/api/api.server";
import { getHttpConfig } from "@/config/http/http.server";
import type { CursorPage } from "@/model/pagination";
import { type ProductId, toProductId } from "@/model/product/product";

import { GetProductsResponse, getProductsQueryFirstMax } from "../../gen/api/endpoints.zod";
import { createHttpClient, type PublicHttpClient } from "../http/request";

/** 一覧の口が 1 度に返せる最大件数。全件を辿る側（`app/sitemap.ts`）が 1 歩の幅として使う。 */
export const PRODUCT_PAGE_LIMIT: number = getProductsQueryFirstMax;

let client: PublicHttpClient | undefined;

/**
 * 主体を名乗らずに商品の口を叩く client。
 *
 * @remarks
 * `products.ts` の client は要求のたびに cookie を読むため、`use cache` の中から呼べず、その口を
 * 持つモジュールごと `use cache` の下から引けません（[0112](../../../../docs/adr/0112-data-classification-cache-boundary.md)
 * 決定 3。ESLint の `no-user-scoped-in-cached-module`）。主体に依らない読み —— サイトマップの列挙 ——
 * だけがこちらを使います。資格情報を持たないので、返るのは公開中のものだけです。
 */
function getClient(): PublicHttpClient {
  client ??= createHttpClient({
    scope: "public",
    baseUrl: getApiConfig().baseUrl,
    maxUrlBytes: getHttpConfig().maxUrlBytes,
  });

  return client;
}

/**
 * 公開中の商品の ID を 1 ページぶん、主体を名乗らずに取得する。
 *
 * @remarks
 * サイトマップが末尾まで辿るための口です。1 ページの幅は契約の上限（{@link PRODUCT_PAGE_LIMIT}）
 * で固定し、辿る側は cursor だけを持ち回ります。
 *
 * @param after - 前のページが返した cursor。先頭なら省略
 */
export async function getPublicProductIds(after?: string): Promise<CursorPage<ProductId>> {
  const page = await getClient().request({
    path: "/v1/products",
    searchParams: { first: String(PRODUCT_PAGE_LIMIT), after },
    schema: GetProductsResponse,
  });

  return {
    items: page.products.map((product) => toProductId(product.id)),
    nextCursor: page.nextCursor,
  };
}
