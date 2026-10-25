import "server-only";

import type { CampaignDraft } from "@/model/campaign/campaign-draft";
import type { CouponDiscount, CouponScopeTarget } from "@/model/coupon/coupon";
import { PostCampaignsResponse } from "../../gen/api/endpoints.zod";
import type {
  CampaignsPostRequest,
  CouponDiscountInput,
  CouponScopeInput,
} from "../../gen/api/model";
import { getUserScopedClient } from "../http/user-scoped-client";

const IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";

/**
 * 値引きを契約の形へ写す。
 *
 * @remarks
 * 定額には上限の欄そのものを載せません。契約は定額に上限を付けた要求を、意味を持たない組み
 * 合わせとして拒みます。
 *
 * @param discount - 表示用の値引き
 * @returns 契約が受け付ける値引き
 */
function toWireDiscount(discount: CouponDiscount): CouponDiscountInput {
  return discount.kind === "flat"
    ? { kind: "flat", value: discount.value }
    : { kind: "rate", value: discount.value, maxAmount: discount.maxAmount };
}

/**
 * 範囲を契約の形へ写す。
 *
 * @param scope - 表示用の範囲
 * @returns 契約が受け付ける範囲。全体は対象を null で送る
 */
function toWireScope(scope: CouponScopeTarget): CouponScopeInput {
  switch (scope.kind) {
    case "all":
      return { kind: "all", targetId: null };
    case "category":
      return { kind: "category", targetId: scope.categoryId };
    case "product":
      return { kind: "product", targetId: scope.productId };
  }
}

/**
 * キャンペーンを定義する。
 *
 * @remarks
 * **冪等キーで再送を初回の結果へ畳みます。** 同じコードの 2 度目は 409 になり、初回の結果を
 * 409 から辿る口が無いため、再送の判定はキーに持たせます。キーを作るのは画面で、1 つの画面に
 * つき 1 つです。
 *
 * 応答は写しません。定義した直後の画面は一覧へ移り、一覧が取り直します。
 *
 * @param draft - 定義するキャンペーンの内容
 * @param idempotencyKey - 再送を初回の結果へ畳むための鍵
 */
export async function createCampaign(draft: CampaignDraft, idempotencyKey: string): Promise<void> {
  await getUserScopedClient().request({
    path: "/v1/campaigns",
    method: "POST",
    headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
    body: {
      code: draft.code,
      discount: toWireDiscount(draft.discount),
      scope: toWireScope(draft.scope),
      minPurchaseAmount: draft.minPurchaseAmount,
      usableFrom: draft.usableFrom === null ? null : draft.usableFrom.toISOString(),
      couponExpiresAt: draft.couponExpiresAt.toISOString(),
      startsAt: draft.startsAt.toISOString(),
      endsAt: draft.endsAt.toISOString(),
      totalLimit: draft.totalLimit,
      perUserLimit: draft.perUserLimit,
    } satisfies CampaignsPostRequest,
    idempotent: true,
    schema: PostCampaignsResponse,
  });
}
