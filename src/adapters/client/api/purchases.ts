import { z } from "zod";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import type { PurchaseHistoryPage } from "@/model/purchase/purchase";

import {
  getPurchasesQueryDaysMax,
  getPurchasesQueryFirstMax,
  getPurchasesQueryMonthRegExp,
} from "../../gen/api/endpoints.zod";

/**
 * 暦月の書式。
 *
 * @remarks
 * 契約が定めた形をそのまま出します。期間を組み立てる画面が、送る前に確かめるために参照します。
 * 書式を書き写すと、契約が変わっても古い形で弾き続けます。
 */
export const PURCHASE_MONTH_PATTERN = getPurchasesQueryMonthRegExp;

/** 直近 N 日で遡れる日数の上限。理由は {@link PURCHASE_MONTH_PATTERN} と同じ。 */
export const PURCHASE_MAX_RECENT_DAYS = getPurchasesQueryDaysMax;

/** 1 度の取得で読める件数の上限。理由は {@link PURCHASE_MONTH_PATTERN} と同じ。 */
export const PURCHASE_LIST_MAX_ITEMS = getPurchasesQueryFirstMax;

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
      statusName: z.string(),
      orderedAt: z.coerce.date(),
    }),
  ),
  nextCursor: z.string().nullable(),
});

/**
 * 購入履歴の続きを取得する。
 *
 * @remarks
 * 同一オリジンの `/api/purchases` を薄く叩くだけです。timeout・再試行・遮断は `adapters/server`
 * が持ちます（[0073](../../../../docs/adr/0073-pagination-fetch-boundary.md)）。ここで独自に
 * 持つと、同じ要求に対して 2 つの再試行が別々の勘定で走ります。
 *
 * 生の status を投げ直さず分類へ写します。呼び出し側は「入力が悪いのか、取得できなかったのか」
 * だけを見て表示を決めます（[0080](../../../../docs/adr/0080-error-handling.md)）。
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
    throw createAppError(response.status === 400 ? ErrorKind.INVALID_ARGUMENT : ErrorKind.INTERNAL);
  }

  const parsed = PurchaseHistoryPagePayload.safeParse(await response.json());

  if (!parsed.success) {
    throw createAppError(ErrorKind.INTERNAL, { cause: parsed.error });
  }

  return parsed.data;
}
