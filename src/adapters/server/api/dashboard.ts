import "server-only";

import { cache } from "react";
import type { z } from "zod";

import { getApiConfig } from "@/config/api/api.server";
import { getHttpConfig } from "@/config/http/http.server";
import {
  DASHBOARD_PERIOD,
  type DashboardPeriod,
  type DashboardSummary,
  type DashboardSummaryQuery,
} from "@/model/dashboard/dashboard";

import {
  GetDashboardSummaryQueryParams,
  GetDashboardSummaryResponse,
} from "../../gen/api/endpoints.zod";
import { getAccessToken } from "../auth/session";
import { createHttpClient, type HttpClient } from "../http/request";

type WireDashboardQuery = z.infer<typeof GetDashboardSummaryQueryParams>;
type WireDashboardSummary = z.infer<typeof GetDashboardSummaryResponse>;

/**
 * 表示側の期間の語彙を、契約が受け付ける値へ写す。
 *
 * @remarks
 * 素通しに見えますが、`satisfies` が両者を型で結び付けています。契約から区分が消えたり綴りが
 * 変わったりすると、この宣言が型エラーになります。表と契約を別々に持つと、契約を再生成しても
 * 表だけが黙って古いまま残ります。
 *
 * 語彙そのものを `model` に置く理由は {@link DASHBOARD_PERIOD} の側にあります。
 */
const PERIOD_TO_WIRE = {
  [DASHBOARD_PERIOD.TODAY]: "today",
  [DASHBOARD_PERIOD.MONTH]: "month",
  [DASHBOARD_PERIOD.RANGE]: "range",
} as const satisfies Readonly<Record<DashboardPeriod, WireDashboardQuery["period"]>>;

/** URL 由来の集計条件。 */
export type RawDashboardQuery = Readonly<Record<string, string | readonly string[]>>;

/** URL の集計条件を契約に照らした結果。 */
export type DashboardQueryParseResult =
  | { readonly ok: true; readonly query: DashboardSummaryQuery }
  /** 契約を外れた条件のキー。表示に使えるよう、検証ライブラリの型ではなく素の名前で返す。 */
  | { readonly ok: false; readonly invalidKeys: readonly string[] };

/**
 * URL の集計条件を、契約に照らして取得条件へ写す。
 *
 * @remarks
 * 検証をこの境界に置く理由は `parseProductQuery` と同じで、条件の許容範囲を決めているのが
 * 契約だからです。日付の書式もここで照らします。
 *
 * **`range` のときに日付が揃っているかは見ません。** 契約はそれを満たさない要求を 400 で返し
 * ますが、日付をこれから選ぶ状態も同じ形になります。区別が付くのは画面の側なので、揃っているか
 * どうかの判断は `features/admin/analytics/period.ts` が持ちます。
 */
export function parseDashboardQuery(raw: RawDashboardQuery): DashboardQueryParseResult {
  const parsed = GetDashboardSummaryQueryParams.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      invalidKeys: [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))],
    };
  }

  return { ok: true, query: parsed.data };
}

let client: HttpClient | undefined;

function getClient(): HttpClient {
  client ??= createHttpClient({
    baseUrl: getApiConfig().baseUrl,
    maxUrlBytes: getHttpConfig().maxUrlBytes,
    getBearerToken: getAccessToken,
  });

  return client;
}

/** 契約の集計を表示用の型へ写す。 */
function toDashboardSummary(wire: WireDashboardSummary): DashboardSummary {
  return {
    salesAmount: wire.salesAmount,
    salesCount: wire.salesCount,
    // 契約がマスタの表示順で返すため、受け取った順序がそのまま表示の順序になる。
    purchaseStatusCounts: wire.purchaseStatusCounts.map(({ status, count }) => ({
      statusId: status.id,
      statusName: status.name,
      count,
    })),
    totalProductCount: wire.totalProductCount,
    publishedProductCount: wire.publishedProductCount,
  };
}

/**
 * 管理側の横断集計を取得する。
 *
 * @remarks
 * キャッシュを指定していません。集計は購入が発生するたびに変わる値で、無効化の引き金になるのは
 * 商品の更新ではなく購入です。商品のタグへ相乗りさせると、商品を触らない限り古い集計が残り
 * 続けます（[0040](../../../../docs/adr/0040-routing-rendering-strategy.md)）。
 *
 * 期間を既定へ寄せず呼び出し側から受けるのは、画面ごとに見たい期間が違うためです。省略時は
 * 契約の既定値（今日）が効きます。
 */
export const getDashboardSummary = cache(
  async ({ period, from, to }: DashboardSummaryQuery = {}): Promise<DashboardSummary> => {
    const summary = await getClient().request({
      path: "/v1/dashboard/summary",
      searchParams: {
        period: period === undefined ? undefined : PERIOD_TO_WIRE[period],
        from,
        to,
      },
      schema: GetDashboardSummaryResponse,
    });

    return toDashboardSummary(summary);
  },
);
