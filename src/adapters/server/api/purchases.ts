import "server-only";

import { cache } from "react";
import type { z } from "zod";

import { getApiConfig } from "@/config/api/api.server";
import type { PurchaseHistoryPage } from "@/model/purchase/purchase";

import { GetPurchasesResponse } from "../../gen/api/endpoints.zod";
import { getAccessToken } from "../auth/session";
import { createHttpClient, type HttpClient } from "../http/request";

type WirePurchases = z.infer<typeof GetPurchasesResponse>;

let client: HttpClient | undefined;

function getClient(): HttpClient {
  client ??= createHttpClient({
    baseUrl: getApiConfig().baseUrl,
    getBearerToken: getAccessToken,
  });

  return client;
}

/** 契約の応答を表示用の 1 ページへ写す。 */
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
 * 注文日時の降順で返ります。並べ替えも絞り込みも契約が受け付けないため、取得側で条件を作れません
 * （受け取るのは cursor の 2 つだけ）。
 *
 * @param first - 取得件数の上限。契約の上限は 200
 */
export const getMyPurchases = cache(async (first: number): Promise<PurchaseHistoryPage> => {
  const wire = await getClient().request({
    path: "/v1/purchases",
    searchParams: { first: String(first) },
    schema: GetPurchasesResponse,
  });

  return toPurchaseHistoryPage(wire);
});
