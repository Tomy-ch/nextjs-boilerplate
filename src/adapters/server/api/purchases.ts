import "server-only";

import { cache } from "react";
import type { z } from "zod";

import { getApiConfig } from "@/config/api/api.server";
import { getHttpConfig } from "@/config/http/http.server";
import { toProductId } from "@/model/product/product";
import type { Purchase, PurchaseHistoryPage, PurchaseOrderLine } from "@/model/purchase/purchase";

import {
  GetPurchasesDetailResponse,
  GetPurchasesQueryParams,
  GetPurchasesResponse,
  PostPurchasesResponse,
} from "../../gen/api/endpoints.zod";
import type { PurchasesPostRequest } from "../../gen/api/model";
import { getAccessToken } from "../auth/session";
import { createHttpClient, type HttpClient } from "../http/request";

const IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";

const PURCHASES_PATH = "/v1/purchases";

type WirePurchases = z.infer<typeof GetPurchasesResponse>;
type WirePurchaseDetail = z.infer<typeof GetPurchasesDetailResponse>;

let client: HttpClient | undefined;

function getClient(): HttpClient {
  client ??= createHttpClient({
    baseUrl: getApiConfig().baseUrl,
    maxUrlBytes: getHttpConfig().maxUrlBytes,
    getBearerToken: getAccessToken,
  });

  return client;
}

function toPurchaseHistoryPage(wire: WirePurchases): PurchaseHistoryPage {
  return {
    items: wire.items.map(({ code, totalAmount, status, orderedAt }) => ({
      code,
      totalAmount,
      statusName: status.name,
      orderedAt: new Date(orderedAt),
    })),
    nextCursor: wire.nextCursor,
  };
}

/** 購入履歴の取得条件。契約のクエリと 1 対 1 に対応する。 */
export type PurchaseHistoryQuery = z.infer<typeof GetPurchasesQueryParams>;

/** `parsePurchaseHistoryQuery` の結果。読めなかったキーは呼び出し側が画面へ出す。 */
export type PurchaseHistoryQueryParseResult =
  | { readonly ok: true; readonly query: PurchaseHistoryQuery }
  | { readonly ok: false; readonly invalidKeys: readonly string[] };

/** 数として宣言されている条件。クエリ文字列からは文字列で届くため、照合の前に直す。 */
const NUMERIC_KEYS: readonly string[] = ["first", "days"];

/**
 * 素のクエリを、契約が受け付ける取得条件へ照合する。
 *
 * @remarks
 * **区分ごとの必須が欠けているかどうかまでは見ません。** そこは契約が 400 で返す領域で、
 * 同じ判定を 2 か所に置くと、増えた区分に片方だけが追いつきます。画面の側は送る前に
 * 組み立てを確かめており（`features/purchases/history/period-draft.ts`）、ここが受け持つのは
 * 「URL に載っている値が契約の型と範囲に収まるか」だけです。
 */
export function parsePurchaseHistoryQuery(
  raw: Readonly<Record<string, string | readonly string[]>>,
): PurchaseHistoryQueryParseResult {
  const typed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== "string") {
      continue;
    }

    typed[key] = NUMERIC_KEYS.includes(key) ? Number(value) : value;
  }

  const parsed = GetPurchasesQueryParams.safeParse(typed);

  if (!parsed.success) {
    return {
      ok: false,
      invalidKeys: [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))],
    };
  }

  return { ok: true, query: parsed.data };
}

/** 取得条件を、クエリ文字列へ載せる形へ写す。 */
function toSearchParams(query: PurchaseHistoryQuery): Record<string, string | undefined> {
  return {
    after: query.after,
    first: String(query.first),
    period: query.period,
    from: query.from,
    to: query.to,
    month: query.month,
    days: query.days?.toString(),
  };
}

/**
 * 自分の購入履歴を 1 ページ取得する。
 *
 * @remarks
 * 注文日時の降順で返ります。並べ替えの条件は契約が受け付けません。
 *
 * 次ページの鍵は応答の `nextCursor` に載ります。**ページ送りの間は同じ期間を渡します。**
 * 途中で条件が変わると keyset の連続性が保証されず、飛ばされる購入が出ます。
 */
export const getMyPurchases = cache(
  async (query: PurchaseHistoryQuery): Promise<PurchaseHistoryPage> => {
    const wire = await getClient().request({
      path: PURCHASES_PATH,
      searchParams: toSearchParams(query),
      schema: GetPurchasesResponse,
    });

    return toPurchaseHistoryPage(wire);
  },
);

function toPurchase(wire: WirePurchaseDetail): Purchase {
  return {
    id: wire.id,
    code: wire.code,
    statusName: wire.status.name,
    subtotalAmount: wire.subtotalAmount,
    taxAmount: wire.taxAmount,
    shippingFee: wire.shippingFee,
    totalAmount: wire.totalAmount,
    lines: wire.details.map(({ productId, productName, quantity, unitPrice }) => ({
      productId: toProductId(productId),
      productName,
      quantity,
      unitPrice,
    })),
    orderedAt: new Date(wire.orderedAt),
  };
}

/**
 * 自分の購入を 1 件取得する。
 *
 * @remarks
 * 他人の購入も存在しない購入も、区別なく `not found` になります。契約が存在を秘匿するためで、
 * 呼び出し側が所有者を確かめる必要はありません。
 *
 * @param purchaseId - 購入の ID。利用者へ見せる購入コードではない
 */
export const getMyPurchase = cache(async (purchaseId: string): Promise<Purchase> => {
  const wire = await getClient().request({
    path: `${PURCHASES_PATH}/${encodeURIComponent(purchaseId)}`,
    schema: GetPurchasesDetailResponse,
  });

  return toPurchase(wire);
});

/**
 * 購入を作る。
 *
 * @remarks
 * **金額は送りません。** 単価も合計もバックエンドがその時点の価格から決めます。画面が見せていた
 * 金額を送り返せる口はなく、送れたとしても古い値になり得ます
 * （[0070](../../../../docs/adr/0070-backend-role-separation.md)）。
 *
 * **冪等キーは必ず付けます。** 契約では任意ですが、購入は自然キーを持たないため、付けない再送は
 * そのまま 2 件目の購入になります。同じ主体が同じキーで送り直した要求は、初回の結果の再生として
 * 扱われます。
 *
 * 在庫が要求に足りない場合は `conflict` として返ります。カートの再評価を通っていても、確定の
 * 瞬間に足りなくなる余地は残ります。
 *
 * @param lines - 購入する商品と数量。1 件以上必要で、同じ商品を 2 行に分けられない
 * @param idempotencyKey - 再送を初回の結果へ畳むための鍵
 * @returns 成立した購入の ID
 */
export async function createPurchase(
  lines: readonly PurchaseOrderLine[],
  idempotencyKey: string,
): Promise<string> {
  const wire = await getClient().request({
    path: PURCHASES_PATH,
    method: "POST",
    headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
    body: {
      details: lines.map(({ productId, quantity }) => ({ productId, quantity })),
    } satisfies PurchasesPostRequest,
    idempotent: true,
    schema: PostPurchasesResponse,
  });

  return wire.id;
}
