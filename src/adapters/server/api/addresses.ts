import "server-only";

import { cache } from "react";
import type { z } from "zod";

import { getApiConfig } from "@/config/api/api.server";
import type { AddressCandidate } from "@/model/user/user";

import { GetAddressesResponse } from "../../gen/api/endpoints.zod";
import { createHttpClient, type HttpClient } from "../http/request";

type WireAddresses = z.infer<typeof GetAddressesResponse>;

let client: HttpClient | undefined;

function getClient(): HttpClient {
  client ??= createHttpClient({ baseUrl: getApiConfig().baseUrl });

  return client;
}

/** 契約の応答を表示用の候補へ写す。 */
function toAddressCandidates(wire: WireAddresses): readonly AddressCandidate[] {
  return wire.candidates.map(({ prefectureName, city, town }) => ({
    prefecture: prefectureName,
    city,
    town,
  }));
}

/**
 * 郵便番号から住所の候補を引く。
 *
 * @remarks
 * 認証を要しない公開の口です。登録の途中、まだ session を持たない利用者も同じ経路を通ります。
 *
 * **外部の lookup が落ちても失敗しません。** 契約は `503` ではなく空の候補と `isFallback` で
 * 返すと定めており、呼び出し側は候補が無いときと同じに扱えます。ここで両者を区別しないのは、
 * 画面がすることがどちらでも同じ（手入力を続けさせる）だからです
 * （[0080](../../../../docs/adr/0080-error-handling.md)）。
 *
 * @param postalCode - `123-4567` 形式の郵便番号
 * @returns 候補。該当なし・外部障害のいずれでも空
 */
export const findAddressCandidates = cache(
  async (postalCode: string): Promise<readonly AddressCandidate[]> => {
    const wire = await getClient().request({
      path: "/v1/addresses",
      searchParams: { postalCode },
      schema: GetAddressesResponse,
    });

    return toAddressCandidates(wire);
  },
);
