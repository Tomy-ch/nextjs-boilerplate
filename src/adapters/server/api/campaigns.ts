import "server-only";

import { cache } from "react";
import type { z } from "zod";
import { type Campaign, type CampaignId, toCampaignId } from "@/model/campaign/campaign";
import type { CampaignDraft } from "@/model/campaign/campaign-draft";
import type { CouponDiscount, CouponScopeTarget } from "@/model/coupon/coupon";
import type { OffsetPage } from "@/model/pagination";

import {
  GetCampaignsQueryParams,
  GetCampaignsResponse,
  getCampaignsQueryPageMax,
  PostCampaignsClaimsResponse,
  PostCampaignsResponse,
  PostCampaignsSuspendResponse,
} from "../../gen/api/endpoints.zod";
import type {
  CampaignClaimsPostRequest,
  CampaignsPostRequest,
  CouponDiscountInput,
  CouponScopeInput,
} from "../../gen/api/model";
import { IDEMPOTENCY_KEY_HEADER } from "../http/request";
import { getUserScopedClient } from "../http/user-scoped-client";
import { toCouponDiscount } from "./coupon-discount";

/**
 * 契約が受け付けるページ番号の上限。
 *
 * @remarks
 * 生成物の宣言をそのまま公開します。呼び出し側は URL から来た番号をこれに収めてから渡します。
 */
export const CAMPAIGN_PAGE_MAX: number = getCampaignsQueryPageMax;

/**
 * 一覧を取る条件。
 *
 * @remarks
 * 1 ページの件数は呼び出し側から受け取ります。何件並べると読めるかは表示の判断です。
 */
export type CampaignQuery = {
  /** 1 から数えるページ番号。 */
  readonly page: number;
  /** 1 ページあたりの件数。 */
  readonly perPage: number;
};

/**
 * 契約の応答 1 件を、一覧が並べる形へ写す。
 *
 * @remarks
 * 範囲を絞る対象の識別子は写しません。名前が届かず、表示に使えないためです。
 *
 * @param wire - 契約のキャンペーン応答 1 件
 * @returns 一覧向けのキャンペーン
 */
function toCampaign(wire: z.infer<typeof GetCampaignsResponse>["campaigns"][number]): Campaign {
  return {
    id: toCampaignId(wire.id),
    code: wire.code,
    discount: toCouponDiscount(wire.discount),
    scopeKind: wire.scope.kind,
    startsAt: wire.startsAt,
    endsAt: wire.endsAt,
    couponExpiresAt: wire.couponExpiresAt,
    totalLimit: wire.totalLimit,
    issuedCount: wire.issuedCount,
    suspendedAt: wire.suspendedAt,
  };
}

/**
 * キャンペーンを一覧で取得する。
 *
 * @remarks
 * **offset 方式です。** 契約は件数を返しますが、位置と 1 ページの件数を返しません。返すのは
 * `campaigns` と `total` だけなので、位置と件数は送った条件から組みます。
 *
 * 並びは配布期間の開始が新しい順で、停止済みと期間を過ぎたものも含みます（契約）。
 *
 * @param query - 一覧を取る条件
 * @returns キャンペーン一覧の 1 ページ
 */
export const getCampaignPage = cache(
  async (query: CampaignQuery): Promise<OffsetPage<Campaign>> => {
    const params = GetCampaignsQueryParams.parse({ page: query.page, perPage: query.perPage });

    const wire = await getUserScopedClient().request({
      path: "/v1/campaigns",
      searchParams: {
        page: params.page.toString(),
        perPage: params.perPage.toString(),
      },
      schema: GetCampaignsResponse,
    });

    return {
      items: wire.campaigns.map(toCampaign),
      total: wire.total,
      perPage: params.perPage,
      offset: (params.page - 1) * params.perPage,
    };
  },
);

/**
 * キャンペーンの配布を止める。
 *
 * @remarks
 * 停止は取り消せず、既に停止済みのキャンペーンへの再実行は `409` です。**配ったクーポンは無効に
 * なりません**（契約）。
 *
 * 鍵は呼び出し側から受け取ります。応答が返らないまま押し直したとき、同じ鍵なら初回の結果が
 * 返り、成功していた停止が「既に停止済み」の失敗に見えずに済みます。鍵を渡すことで再送して
 * よい呼び出しになるため、`idempotent` を宣言します。
 *
 * @param id - 止めるキャンペーン
 * @param idempotencyKey - この停止の試みを指す鍵
 */
export async function suspendCampaign(id: CampaignId, idempotencyKey: string): Promise<void> {
  await getUserScopedClient().request({
    path: `/v1/campaigns/${encodeURIComponent(id)}/suspend`,
    method: "POST",
    headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
    idempotent: true,
    schema: PostCampaignsSuspendResponse,
  });
}

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
 * 409 から辿る口が無いため、再送の判定はキーに持たせます。キーを作るのは画面で、結果が定まるまで
 * 同じキーで送り直します。
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
