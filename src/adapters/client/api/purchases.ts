import * as z from "zod/mini";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import type { PurchaseHistoryPage } from "@/model/purchase/purchase";

/**
 * BFF が返す履歴 1 ページの形。
 *
 * @remarks
 * 契約から生成したスキーマではありません。この経路が受け取るのはバックエンドの応答ではなく、
 * `/api/purchases` が組み立てた表示用の形だからです。生成物を当てても、形が違うので通りません。
 *
 * それでも検証するのは、応答を検証せずに UI へ流さない原則が client 側の経路にも等しく効くため
 * です（[0073](../../../../docs/adr/0073-pagination-fetch-boundary.md)）。
 *
 * 注文日時は JSON を経由する間に文字列へ落ちるため、ここで `Date` へ戻します。戻さずに渡すと、
 * 初回ページ（Server Component 経由で `Date`）と続き（文字列）で型が食い違います。
 */
const PurchaseHistoryPagePayload = z.object({
  items: z.array(
    z.object({
      code: z.string(),
      totalAmount: z.int(),
      statusCode: z.int(),
      statusName: z.string(),
      orderedAt: z.coerce.date(),
    }),
  ),
  nextCursor: z.nullable(z.string()),
});

/**
 * 応答の status を分類へ写す。
 *
 * @remarks
 * **資格情報切れを内部の失敗へ畳みません。** この口は認証の内側にあり、読み進めている最中に
 * session が切れることがあります。畳むと画面には読み直す操作しか出せず、押しても同じ経路を
 * 辿るので永久に直りません。分類が分かれていれば、呼び出し側は入り直しを促せます
 * （[0080](../../../../docs/adr/0080-error-handling.md) は `Unauthenticated` を独立した分類として
 * 持ち、生の status からの変換を境界で 1 度だけ行うと定めています）。
 */
function toErrorKind(status: number): ErrorKind {
  if (status === 400) {
    return ErrorKind.INVALID_ARGUMENT;
  }

  if (status === 401) {
    return ErrorKind.UNAUTHENTICATED;
  }

  return ErrorKind.INTERNAL;
}

/**
 * 購入履歴の続きを取得する。
 *
 * @remarks
 * 同一オリジンの `/api/purchases` を薄く叩くだけです。timeout・再試行・遮断は `adapters/server`
 * が持ちます（[0073](../../../../docs/adr/0073-pagination-fetch-boundary.md)）。ここで独自に
 * 持つと、同じ要求に対して 2 つの再試行が別々の勘定で走ります。
 *
 * 生の status を投げ直さず分類へ写します。呼び出し側が見るのは分類だけです
 * （[0080](../../../../docs/adr/0080-error-handling.md)）。
 *
 * @param query - URL へ載せる取得条件。カーソルと期間を含める
 * @param signal - 条件が変わった、または画面を離れたときに取得を打ち切る
 */
export async function fetchPurchaseHistoryPage(
  query: URLSearchParams,
  signal?: AbortSignal,
): Promise<PurchaseHistoryPage> {
  const response = await fetch(`/api/purchases?${query.toString()}`, {
    headers: { accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw createAppError(toErrorKind(response.status));
  }

  const parsed = PurchaseHistoryPagePayload.safeParse(await response.json());

  if (!parsed.success) {
    throw createAppError(ErrorKind.INTERNAL, { cause: parsed.error });
  }

  return parsed.data;
}
