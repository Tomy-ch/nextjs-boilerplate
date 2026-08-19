import { z } from "zod";

import type { AddressCandidate } from "@/model/user/user";

import { request } from "../http/request";

/**
 * BFF が返す候補の形。
 *
 * @remarks
 * 契約から生成したスキーマではありません。`/api/addresses` が組み立てた表示用の形を受け取るため
 * です。検証する理由は `api/products.ts` の同種のスキーマと同じです。
 */
const AddressCandidatesPayload = z.object({
  candidates: z.array(z.object({ prefecture: z.string(), city: z.string(), town: z.string() })),
});

/**
 * 郵便番号から住所の候補を引く。
 *
 * @remarks
 * 同一オリジンの `/api/addresses` を {@link request} で叩くだけです。
 *
 * **失敗を投げません。** 補完は入力を助けるためのもので、引けなかったときにすることは
 * 「何もしない」です。呼び出し側に握り潰しの判断を配ると、画面ごとに扱いが割れます
 * （[0080](../../../../docs/adr/0080-error-handling.md) の degrade）。
 *
 * @param postalCode - `123-4567` 形式の郵便番号
 * @param signal - 入力が続いた、または画面を離れたときに取得を打ち切る
 * @returns 候補。引けなかったときは空
 */
export async function fetchAddressCandidates(
  postalCode: string,
  signal?: AbortSignal,
): Promise<readonly AddressCandidate[]> {
  try {
    const { candidates } = await request(
      `/api/addresses?postalCode=${encodeURIComponent(postalCode)}`,
      AddressCandidatesPayload,
      signal,
    );

    return candidates;
  } catch {
    return [];
  }
}
