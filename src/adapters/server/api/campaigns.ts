import "server-only";

import { PostCampaignsClaimsResponse } from "../../gen/api/endpoints.zod";
import type { CampaignClaimsPostRequest } from "../../gen/api/model";
import { IDEMPOTENCY_KEY_HEADER } from "../http/request";
import { getUserScopedClient } from "../http/user-scoped-client";

/**
 * キャンペーンコードを示して、クーポンを 1 枚受け取る。
 *
 * @remarks
 * **受け取れない理由は区別されません。** 存在しない・期間外・停止済み・上限到達・形式不正の
 * いずれも `VALIDATION` で返ります。区別できると有効なコードを言い当てる手がかりになるためです。
 *
 * コードは手を加えずに送ります。前後の空白と大文字・小文字の違いは契約側が無視します。
 *
 * **冪等キーは必須です。** 受け取りは取り消せず、別のキーで送り直すと上限内でもう 1 枚配られます。
 * 受け取った 1 枚は保有一覧の取り直しに現れるため、応答は検証だけして返しません。
 *
 * @param code - 利用者が入力したキャンペーンコード
 * @param idempotencyKey - 再送を初回の結果へ畳むための鍵
 */
export async function claimCampaignCoupon(code: string, idempotencyKey: string): Promise<void> {
  await getUserScopedClient().request({
    path: "/v1/campaigns/claims",
    method: "POST",
    headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
    body: { code } satisfies CampaignClaimsPostRequest,
    idempotent: true,
    schema: PostCampaignsClaimsResponse,
  });
}
