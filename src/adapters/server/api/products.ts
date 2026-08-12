import "server-only";

import { cache } from "react";
import type { z } from "zod";

import { getApiConfig } from "@/config/api/api.server";
import type { CursorPage } from "@/model/pagination";
import type { Product, ProductListItem, ProductPage } from "@/model/product/product";

import {
  GetProductsDetailResponse,
  GetProductsQueryParams,
  GetProductsResponse,
} from "../../gen/api/endpoints.zod";
import { createHttpClient, type HttpClient } from "../http/request";
import { resolveMediaUrl } from "../media/media-url";

type WireProductQuery = z.infer<typeof GetProductsQueryParams>;

/**
 * 契約が受け付ける並び順。
 *
 * @remarks
 * 値そのものは契約の enum です。`satisfies` で生成スキーマの型に照らしてあるため、契約から
 * 値が消えたり綴りが変わったりすると、この宣言が型エラーになります。手で書き写した一覧は
 * 契約を再生成しても黙って古いままになるので、照合を型に持たせています。
 */
export const PRODUCT_SORT = {
  /** 公開日時の降順。契約の既定値。 */
  NEWEST: "-publishedAt",
  /** 公開日時の昇順。 */
  OLDEST: "publishedAt",
} as const satisfies Readonly<Record<string, WireProductQuery["sort"]>>;

/** 一覧の並び順として指定できる値。 */
export type ProductSort = (typeof PRODUCT_SORT)[keyof typeof PRODUCT_SORT];

/** 商品一覧の取得条件。契約のクエリと 1 対 1 に対応する。 */
export type ProductQuery = {
  after?: string;
  first?: number;
  categoryId?: string;
  statusId?: string;
  keyword?: string;
  sort?: ProductSort;
};

/** URL 由来の検索条件。1 つのキーに 1 つの文字列へ正規化済みであることを前提とする。 */
export type RawProductQuery = Readonly<Record<string, string>>;

/** URL の検索条件を契約に照らした結果。 */
export type ProductQueryParseResult =
  | { readonly ok: true; readonly query: ProductQuery }
  /** 契約を外れた条件のキー。表示に使えるよう、検証ライブラリの型ではなく素の名前で返す。 */
  | { readonly ok: false; readonly invalidKeys: readonly string[] };

/**
 * URL の検索条件を、契約に照らして取得条件へ写す。
 *
 * @remarks
 * 検証をこの境界に置くのは、条件の許容範囲を決めているのが契約だからです。画面側に写すと、
 * 契約を再生成しても検証だけが古い範囲のまま残り、通ると思った値が backend で 400 になります。
 *
 * 範囲外の値を捨てて既定へ戻すことはしません。URL は利用者が直接編集できる入力であり、黙って
 * 捨てると絞り込んだつもりの一覧が絞り込まれずに出ます。写せなかったことだけを返し、どう表示
 * するかは画面側が決めます。
 *
 * 未指定のキーは契約の既定値で埋まります。件数と並び順の既定を画面ごとに決め直すと、URL を
 * 省略したときの結果が画面によって変わります。
 */
export function parseProductQuery(raw: RawProductQuery): ProductQueryParseResult {
  const parsed = GetProductsQueryParams.safeParse({
    ...raw,
    // URL の値は常に文字列だが、契約は件数を整数で宣言している。
    ...(raw.first === undefined ? {} : { first: Number(raw.first) }),
  });

  if (!parsed.success) {
    return {
      ok: false,
      invalidKeys: [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))],
    };
  }

  return { ok: true, query: parsed.data };
}

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
    stockWarningThreshold: wire.stockWarningThreshold,
    status: { id: wire.status.id, name: wire.status.name },
    category: { id: wire.category.id, name: wire.category.name },
    publishedAt: wire.publishedAt === null ? null : new Date(wire.publishedAt),
    // 契約は 1 枚だけを返すため、表示側の複数枚前提に合わせて 1 要素の配列へ正規化する。
    imagePaths: wire.imagePath === null ? [] : [wire.imagePath],
  };
}

/** 契約の 1 ページを表示用の型へ写す。 */
export function toProductPage(wire: WireProductPage): ProductPage {
  return {
    items: wire.products.map(toProduct),
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
      statusId: query.statusId,
      keyword: query.keyword,
      sort: query.sort,
    },
    schema: GetProductsResponse,
    tags: [PRODUCTS_TAG],
  });

  return toProductPage(page);
});

/**
 * 商品を一覧の表示データへ写す。
 *
 * @remarks
 * 画像 URL の解決をここで済ませるのは、配信元が設定から来るためです。設定を読めるのは
 * `adapters` までで、画面側は解決済みの URL しか受け取りません。
 */
function toProductListItem(product: Product): ProductListItem {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    quantity: product.quantity,
    categoryName: product.category.name,
    statusName: product.status.name,
    imageUrl: resolveMediaUrl(product.imagePaths[0] ?? null),
  };
}

/**
 * 商品一覧を、表示に必要なものだけへ絞った 1 ページとして取得する。
 *
 * @remarks
 * 増分取得が同じ形を JSON で受け取るため、`Date` や省略可能な値を含まない形へここで落とします
 * （[0073](../../../../docs/adr/0073-pagination-fetch-boundary.md)）。初回ページと増分ページで
 * 形が違うと、積み上げた一覧の途中から表示が壊れます。
 */
export async function getProductListPage(
  query: ProductQuery = {},
): Promise<CursorPage<ProductListItem>> {
  const page = await getProducts(query);

  return { items: page.items.map(toProductListItem), nextCursor: page.nextCursor };
}

/**
 * 商品 1 件を取得する。
 *
 * @remarks
 * 一覧と同じ経路を通すため、生 status の分類と応答の検証は fetch wrapper が済ませています。
 * 存在しない ID は wrapper が `not-found` へ正規化するため、ここでは分岐を持ちません。
 */
export const getProduct = cache(async (id: string): Promise<Product> => {
  const product = await getClient().request({
    path: `/v1/products/${encodeURIComponent(id)}`,
    schema: GetProductsDetailResponse,
    tags: [PRODUCTS_TAG],
  });

  return toProduct(product);
});
