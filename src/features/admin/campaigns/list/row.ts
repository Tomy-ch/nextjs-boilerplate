import type { BadgeVariant } from "@/components/design-system/display/badge/badge.definition";
import type { Campaign, CampaignId } from "@/model/campaign/campaign";
import { COUPON_SCOPE_NAME } from "@/model/coupon/coupon";
import { formatCouponDiscount, formatCouponDiscountCap } from "@/model/coupon/discount-label";
import { formatDateTime } from "@/model/datetime";

import {
  DISTRIBUTION_STATUS,
  DISTRIBUTION_STATUS_NAME,
  toDistributionStatus,
} from "./distribution-status";
import { toDistributionStatusTone } from "./status-tone";

/**
 * 表に 1 行として並べるキャンペーン。
 *
 * @remarks
 * **日時と値引きは整形済みの文字列で持ちます。** 整形はサーバで済ませ、client の部品へ `Date` を
 * 渡しません。描く側で整形すると、サーバとブラウザで別の値が出る余地が残ります。
 */
export type AdminCampaignRow = {
  readonly id: CampaignId;
  readonly code: string;
  readonly statusName: string;
  /** 状態に対応するバッジの見た目。 */
  readonly statusTone: BadgeVariant;
  /** 停止したか。停止した行には停止の操作を出さない。 */
  readonly suspended: boolean;
  /** 配布期間の開始。この時刻ちょうどを含む。 */
  readonly startsAt: string;
  /** 配布期間の終了。この時刻ちょうどは含まない。 */
  readonly endsAt: string;
  /** まだ配れる枚数。 */
  readonly remaining: number;
  /** 配れる総枚数。 */
  readonly totalLimit: number;
  /** 値引きの額面。 */
  readonly discount: string;
  /** 定率の値引きの上限。上限を持たない値引きは undefined。 */
  readonly discountCap: string | undefined;
  /** 値引きの適用範囲の呼び名。 */
  readonly scopeName: string;
  /** 配るクーポンの有効期限。 */
  readonly couponExpiresAt: string;
  /** 停止した日時。停止していなければ null。 */
  readonly suspendedAt: string | null;
};

/**
 * キャンペーンを、表に並べる行へ写す。
 *
 * @remarks
 * **残り枚数は総枚数と配った枚数の差です。** 契約がこの差で読むよう委ねています。上限を超えて
 * 配ることは契約が起こさないと宣言しているので、負の値への守りは置きません。
 *
 * @param campaigns - 表に並べるキャンペーン
 * @param now - 状態の判定の基準にする時刻
 * @returns 表に並べる行の一覧
 */
export function toAdminCampaignRows(
  campaigns: readonly Campaign[],
  now: Date,
): readonly AdminCampaignRow[] {
  return campaigns.map((campaign) => {
    const status = toDistributionStatus(campaign, now);

    return {
      id: campaign.id,
      code: campaign.code,
      statusName: DISTRIBUTION_STATUS_NAME[status],
      statusTone: toDistributionStatusTone(status),
      suspended: status === DISTRIBUTION_STATUS.SUSPENDED,
      startsAt: formatDateTime(new Date(campaign.startsAt)),
      endsAt: formatDateTime(new Date(campaign.endsAt)),
      remaining: campaign.totalLimit - campaign.issuedCount,
      totalLimit: campaign.totalLimit,
      discount: formatCouponDiscount(campaign.discount),
      discountCap: formatCouponDiscountCap(campaign.discount),
      scopeName: COUPON_SCOPE_NAME[campaign.scopeKind],
      couponExpiresAt: formatDateTime(new Date(campaign.couponExpiresAt)),
      suspendedAt:
        campaign.suspendedAt === null ? null : formatDateTime(new Date(campaign.suspendedAt)),
    };
  });
}
