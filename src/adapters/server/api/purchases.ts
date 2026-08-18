import "server-only";

import { cache } from "react";
import type { z } from "zod";

import { getApiConfig } from "@/config/api/api.server";
import { toProductId } from "@/model/product/product";
import type { Purchase, PurchaseHistoryPage, PurchaseOrderLine } from "@/model/purchase/purchase";

import {
  GetPurchasesDetailResponse,
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

/**
 * 自分の購入履歴を取得する。
 *
 * @remarks
 * 注文日時の降順で返ります。並べ替えの条件は契約が受け付けません。
 *
 * **先頭の 1 ページだけを返します。** 契約は期間の絞り込み（`period`）とページ送り（`after`）も
 * 受け付けますが、どちらもまだ渡していません。次ページの鍵は応答の `nextCursor` に載ります。
 *
 * @param first - 取得件数の上限。契約の上限は 200
 */
export const getMyPurchases = cache(async (first: number): Promise<PurchaseHistoryPage> => {
  const wire = await getClient().request({
    path: PURCHASES_PATH,
    searchParams: { first: String(first) },
    schema: GetPurchasesResponse,
  });

  return toPurchaseHistoryPage(wire);
});

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
