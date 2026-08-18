import type { RequestHandler } from "msw";

// sample:replace-begin
import { HttpResponse, http } from "msw";

import type { AddressCandidate } from "@/model/user/user";

import {
  ADDRESS_CANDIDATES,
  SINGLE_ADDRESS_CANDIDATE,
} from "../../src/features/account/account.fixture";

/**
 * カタログで引ける郵便番号。
 *
 * @remarks
 * 宣言に無い番号は候補なしで返します。外部の lookup が引けなかったときと同じ応答で、契約が
 * そう定めています（`200` と空の候補）。
 */
const ADDRESS_BY_POSTAL_CODE: Readonly<Record<string, readonly AddressCandidate[]>> = {
  /** 町域が割れる。都道府県と市区町村だけが埋まる。 */
  "150-0001": ADDRESS_CANDIDATES,
  /** 町域まで 1 つに定まる。丁目・番地が空なら町域まで埋まる。 */
  "220-0012": SINGLE_ADDRESS_CANDIDATE,
};

/** 確定前の条件で数えた件数。どの条件でも同じ数を返す。 */
const FILTERED_COUNT = 42;
// sample:replace-with
// sample:replace-end

/**
 * カタログが自分で答える `/api/*` の口
 * （[0054](../../docs/adr/0054-ui-catalog-storybook.md)）。
 *
 * @remarks
 * 返すのは Route Handler が組み立てる表示用の形で、契約からの生成物ではありません（置き場を
 * [mocks](../../mocks/README.md) と分けているのはこのためです）。形は `adapters/client` が
 * 検証しており、ずれた応答は部品が失敗の見え方へ落ちる形で現れます。
 */
// sample:replace-begin
export const handlers: readonly RequestHandler[] = [
  http.get("/api/addresses", ({ request }) => {
    const postalCode = new URL(request.url).searchParams.get("postalCode") ?? "";

    return HttpResponse.json({ candidates: ADDRESS_BY_POSTAL_CODE[postalCode] ?? [] });
  }),
  http.get("/api/products/count", () => HttpResponse.json({ count: FILTERED_COUNT })),
];
// sample:replace-with
// = export const handlers: readonly RequestHandler[] = [];
// sample:replace-end
