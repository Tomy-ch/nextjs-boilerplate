import { z } from "zod";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import type { CursorPage } from "@/model/pagination";
import type { ProductListItem } from "@/model/product/product";

import { getProductsQueryFirstMax } from "../../gen/api/endpoints.zod";

/**
 * 1 度の取得で読める件数の上限。
 *
 * @remarks
 * 契約が定めた値をそのまま出します。読み進めた件数を URL へ書き戻す側が、書ける上限として
 * 参照します。数を書き写すと、契約が広がっても古い上限で頭打ちになります。
 */
export const PRODUCT_LIST_MAX_ITEMS = getProductsQueryFirstMax;

/**
 * BFF が返す一覧 1 ページの形。
 *
 * @remarks
 * 契約から生成したスキーマではありません。この経路が受け取るのはバックエンドの応答ではなく、
 * `/api/products` が組み立てた表示用の形だからです。生成物を当てても、形が違うので通りません。
 *
 * それでも検証するのは、応答を検証せずに UI へ流さない原則が client 側の経路にも等しく効くため
 * です（[0073](../../../../docs/adr/0073-pagination-fetch-boundary.md)）。
 */
const ProductListPagePayload = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      price: z.string(),
      quantity: z.int(),
      categoryName: z.string(),
      statusName: z.string(),
      imageUrl: z.string().nullable(),
    }),
  ),
  nextCursor: z.string().nullable(),
});

/**
 * 一覧の続きを取得する。
 *
 * @remarks
 * 同一オリジンの `/api/products` を薄く叩くだけです。timeout・再試行・遮断は `adapters/server`
 * が持ちます（[0073](../../../../docs/adr/0073-pagination-fetch-boundary.md)）。ここで独自に
 * 持つと、同じ要求に対して 2 つの再試行が別々の勘定で走ります。
 *
 * 生の status を投げ直さず分類へ写します。呼び出し側は「入力が悪いのか、取得できなかったのか」
 * だけを見て表示を決めます（[0080](../../../../docs/adr/0080-error-handling.md)）。
 *
 * @param query - URL へ載せる検索条件。カーソルを含める
 * @param signal - 条件が変わった、または画面を離れたときに取得を打ち切る
 */
export async function fetchProductListPage(
  query: Readonly<Record<string, string>>,
  signal?: AbortSignal,
): Promise<CursorPage<ProductListItem>> {
  const response = await fetch(`/api/products?${new URLSearchParams(query).toString()}`, {
    headers: { accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw createAppError(response.status === 400 ? ErrorKind.INVALID_ARGUMENT : ErrorKind.INTERNAL);
  }

  const parsed = ProductListPagePayload.safeParse(await response.json());

  if (!parsed.success) {
    throw createAppError(ErrorKind.INTERNAL, { cause: parsed.error });
  }

  return parsed.data;
}
