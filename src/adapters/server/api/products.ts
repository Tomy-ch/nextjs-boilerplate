import "server-only";

import { cache } from "react";
import type { z } from "zod";

import { getApiConfig } from "@/config/api/api.server";
import type { CursorPage } from "@/model/pagination";
import type {
  Product,
  ProductListItem,
  ProductPage,
  ProductRankingEntry,
} from "@/model/product/product";

import {
  GetProductsCountResponse,
  GetProductsDetailResponse,
  GetProductsQueryParams,
  type GetProductsRankingQueryParams,
  GetProductsRankingResponse,
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
type ProductSort = (typeof PRODUCT_SORT)[keyof typeof PRODUCT_SORT];

/**
 * この面が受け付ける取得条件のスキーマ。
 *
 * @remarks
 * 分類と状態は後継の `categoryCodes` / `statusCodes` だけを受けます。契約は非推奨の
 * `categoryId` / `statusId` も残していますが、後継と同時に送ると 400 になる関係にあり、
 * 片方だけを窓口にしないと URL の書き方次第で取得そのものが落ちます。
 */
const ProductQueryParams = GetProductsQueryParams.omit({ categoryId: true, statusId: true });

/** 商品一覧の取得条件。契約のクエリと 1 対 1 に対応する。 */
export type ProductQuery = {
  after?: string;
  first?: number;
  /** 分類のコード。マスタ行を指す静的な番号で、UUID ではない。 */
  categoryCodes?: readonly number[];
  /** 状態のコード。分類と同じくマスタ行を指す静的な番号。 */
  statusCodes?: readonly number[];
  keyword?: string;
  /** 最低価格。契約が decimal 文字列で受けるため、数値へ直さず持ち回る。 */
  minPrice?: string;
  /** 最高価格。 */
  maxPrice?: string;
  /** 最低在庫数。 */
  minQuantity?: number;
  /** 最高在庫数。 */
  maxQuantity?: number;
  sort?: ProductSort;
};

/**
 * URL 由来の検索条件。
 *
 * @remarks
 * 1 つのキーに複数の値が並ぶことを許します。分類のように複数選べる条件は、区切り文字で連結
 * した 1 つの値ではなく同じキーの繰り返しで表すためです。
 */
export type RawProductQuery = Readonly<Record<string, string | readonly string[]>>;

/**
 * 契約が整数で宣言しているキー。
 *
 * @remarks
 * URL の値は常に文字列なので、そのまま渡すと整数の宣言に当たって落ちます。
 */
const INTEGER_KEYS: readonly string[] = ["first", "minQuantity", "maxQuantity"];

/**
 * 契約が整数の並びで宣言しているキー。
 *
 * @remarks
 * 1 つだけ選ばれた条件は URL に 1 回しか現れず、素の値としては単一の文字列で届きます。
 * 並びへ揃えないと、1 つ選んだときだけ契約の宣言に当たって落ちます。
 */
const INTEGER_ARRAY_KEYS: readonly string[] = ["categoryCodes", "statusCodes"];

/** 素の値を、契約が宣言した型へ直す。 */
function toTypedQuery(raw: RawProductQuery): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, toTypedValue(key, value)]),
  );
}

function toTypedValue(key: string, value: string | readonly string[]): unknown {
  if (INTEGER_ARRAY_KEYS.includes(key)) {
    return (typeof value === "string" ? [value] : value).map(Number);
  }

  return INTEGER_KEYS.includes(key) && typeof value === "string" ? Number(value) : value;
}

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
  const parsed = ProductQueryParams.safeParse(toTypedQuery(raw));

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

/**
 * 一致する対象を決める条件だけを、クエリ文字列の形へ写す。
 *
 * @remarks
 * 一覧と件数がどちらもこの一式を送ります。取り出す位置（`after` / `first`）と並び順は件数に
 * 効かないため含めません。片方だけに条件を足すと、出ている件数と一覧の中身が食い違います。
 */
function toFilterParams(
  query: ProductQuery,
): Record<string, string | readonly string[] | undefined> {
  return {
    // 契約は整数の並びで宣言しているが、クエリ文字列に載せる時点で文字列へ戻る。
    categoryCodes: query.categoryCodes?.map(String),
    statusCodes: query.statusCodes?.map(String),
    keyword: query.keyword,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    minQuantity: query.minQuantity?.toString(),
    maxQuantity: query.maxQuantity?.toString(),
  };
}

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
    // 契約が displaySort 昇順で返すため、受け取った順序がそのまま表示の順序になる。
    imagePaths: wire.images.map((image) => image.imagePath),
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
      ...toFilterParams(query),
      after: query.after,
      first: query.first?.toString(),
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
    // 一覧は 1 件を 1 枚で表すため先頭を採る。どれを代表とするかは契約の順序が決めている。
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
 * 条件に一致する商品の総数を取得する。
 *
 * @remarks
 * cursor ページネーションは総数を持たないため、一覧の応答からは取り出せません
 * （[0073](../../../../docs/adr/0073-pagination-fetch-boundary.md)）。総数はこの取得口だけが返します。
 *
 * 一覧と同じ条件を受け取ります。条件を渡さない口にすると、絞り込んだ後も絞り込む前の数が出て、
 * 一覧に並んでいる件数と食い違います。
 */
export const getProductCount = cache(async (query: ProductQuery = {}): Promise<number> => {
  const { count } = await getClient().request({
    path: "/v1/products/count",
    searchParams: toFilterParams(query),
    schema: GetProductsCountResponse,
    tags: [PRODUCTS_TAG],
  });

  return count;
});

type WireRankingQuery = z.infer<typeof GetProductsRankingQueryParams>;

/**
 * 契約が受け付ける集計期間。
 *
 * @remarks
 * 照合を型に持たせる理由は {@link PRODUCT_SORT} と同じです。
 */
export const RANKING_PERIOD = {
  /** 全期間。契約の既定値。 */
  ALL: "all",
  /** 注文日時が直近 30 日以内の購入のみ。 */
  LAST_30_DAYS: "30d",
} as const satisfies Readonly<Record<string, WireRankingQuery["period"]>>;

/** 売上ランキングの取得条件。契約のクエリと 1 対 1 に対応する。 */
export type ProductRankingQuery = {
  period?: (typeof RANKING_PERIOD)[keyof typeof RANKING_PERIOD];
  limit?: number;
};

/**
 * 売上ランキングを取得する。
 *
 * @remarks
 * キャッシュを指定していません。ランキングは購入が発生するたびに変わる集計値であり、
 * 無効化の引き金になるのは商品の更新ではなく購入です。商品のタグへ相乗りさせると、商品を
 * 触らない限り古い集計が残り続けます（[0040](../../../../docs/adr/0040-routing-rendering-strategy.md)）。
 *
 * 件数と期間を既定へ寄せず呼び出し側から受けるのは、画面ごとに要る件数が違うためです。
 * 省略時は契約の既定値（全期間・上位 10 件）が効きます。
 */
export const getProductRanking = cache(
  async ({ period, limit }: ProductRankingQuery = {}): Promise<readonly ProductRankingEntry[]> => {
    const response = await getClient().request({
      path: "/v1/products/ranking",
      searchParams: { period, limit: limit?.toString() },
      schema: GetProductsRankingResponse,
    });

    return response.rankings.map((entry) => ({
      productId: entry.productId,
      name: entry.name,
      price: entry.price,
      soldQuantity: entry.soldQuantity,
    }));
  },
);

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
