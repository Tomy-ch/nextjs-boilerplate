import "server-only";

import { getApiConfig } from "@/config/api/api.server";
import { getHttpConfig } from "@/config/http/http.server";
import { BASE_CURRENCY, type ReferenceAmount } from "@/model/money";

import { GetExchangeRatesResponse } from "../../gen/api/endpoints.zod";
import { getAccessToken } from "../auth/session";
import { createHttpClient, type HttpClient } from "../http/request";

/** 参考換算に使える表示通貨。契約が受け付ける値そのもの。 */
const DISPLAY_CURRENCY = "JPY";

/** 基準通貨 1 単位あたりの最小単位の数。契約が decimal 文字列を要求するため、ここで主単位へ戻す。 */
const MINOR_UNITS_PER_UNIT = 100;

/** 基準通貨の小数桁。 */
const MINOR_UNIT_DIGITS = 2;

let client: HttpClient | undefined;

/**
 * 為替の接続先。
 *
 * @remarks
 * 認証を任意にします。参考換算は購入前の利用者にも要るため、契約が資格情報の無い呼び出しも
 * 受け付けます。
 */
function getClient(): HttpClient {
  client ??= createHttpClient({
    baseUrl: getApiConfig().baseUrl,
    maxUrlBytes: getHttpConfig().maxUrlBytes,
    getBearerToken: getAccessToken,
    allowAnonymous: true,
  });

  return client;
}

/**
 * 基準通貨の金額を、表示通貨での参考換算額へ写す。
 *
 * @remarks
 * **参考換算額は請求額ではありません。** 保存される金額は基準通貨のままで、この値は表示にしか
 * 使いません。
 *
 * 換算できなかった場合（レートの提供元が表示通貨を持たない等）は契約が `null` を返します。
 * 通信そのものが失敗した場合は投げます。**落として良いかどうかを決めるのは呼び出し側**であり、
 * この境界は結果を伝えるだけです（[0080](../../../../docs/adr/0080-error-handling.md)）。
 *
 * @param minorUnits - 最小単位（セント）の整数で表した基準通貨の金額
 * @returns 換算できなければ null
 */
export async function convertToReferenceAmount(
  minorUnits: number,
): Promise<ReferenceAmount | null> {
  const wire = await getClient().request({
    path: "/v1/exchange-rates",
    searchParams: {
      base: BASE_CURRENCY,
      quote: DISPLAY_CURRENCY,
      original: (minorUnits / MINOR_UNITS_PER_UNIT).toFixed(MINOR_UNIT_DIGITS),
      displayCurrency: DISPLAY_CURRENCY,
    },
    schema: GetExchangeRatesResponse,
  });

  if (wire.referenceAmount === undefined || wire.referenceAmount === null) {
    return null;
  }

  return {
    currency: wire.referenceAmount.currency,
    amount: wire.referenceAmount.amount,
    rate: wire.referenceAmount.rate,
    rateDate: wire.referenceAmount.rateDate,
  };
}
