import { FeedbackState } from "@/components/app-starter/feedback-state/feedback-state";
import { FEEDBACK_STATE_KIND } from "@/components/app-starter/feedback-state/feedback-state.definition";
import { Badge } from "@/components/design-system/display/badge/badge";
import {
  BADGE_VARIANT,
  type BadgeVariant,
} from "@/components/design-system/display/badge/badge.definition";
import {
  List,
  ListItem,
  ListItemContent,
  ListItemDescription,
  ListItemTitle,
} from "@/components/design-system/display/list/list";
import { LIST_ITEM_VARIANT } from "@/components/design-system/display/list/list.definition";
import { COUPON_SCOPE_NAME, type HeldCoupon } from "@/model/coupon/coupon";
import { formatCouponDiscount, formatCouponDiscountCap } from "@/model/coupon/discount-label";
import { formatDateTime } from "@/model/datetime";
import { formatMoney } from "@/model/money";
import { withPartSpan } from "@/observability/render-span";

import { HOLDING_STATUS_NAME, type HoldingStatus, holdingStatusAt } from "../../../holding-status";

/** `CouponList` の props。 */
export type CouponListProps = {
  /** 保有クーポン。応答の順序（発行の新しい順）のまま並べる。 */
  readonly coupons: readonly HeldCoupon[];
  /** 状態を決める時刻。 */
  readonly now: Date;
};

const LIST_LABEL = "保有クーポンの一覧";

const EMPTY_TITLE = "まだクーポンはありません。";

const EMPTY_DESCRIPTION = "キャンペーンコードをお持ちなら、上の欄から受け取れます。";

/** 状態ごとの印の見た目。意味は印の文字が伝え、色は補うだけにする。 */
const STATUS_VARIANT: Readonly<Record<HoldingStatus, BadgeVariant>> = {
  unused: BADGE_VARIANT.SUCCESS,
  notStarted: BADGE_VARIANT.OUTLINE,
  used: BADGE_VARIANT.SECONDARY,
  expired: BADGE_VARIANT.SECONDARY,
};

/**
 * 状態に応じて、その券について確かめたい時刻を文言にする。
 *
 * @param coupon - 保有クーポン
 * @param status - その券の状態
 * @returns 時刻の文言
 */
function timingOf(coupon: HeldCoupon, status: HoldingStatus): string {
  const expires = `期限 ${formatDateTime(coupon.expiresAt)}`;

  if (status === "used" && coupon.usedAt !== null) {
    return `使用 ${formatDateTime(coupon.usedAt)}`;
  }

  if (status === "notStarted" && coupon.usableFrom !== null) {
    return `利用開始 ${formatDateTime(coupon.usableFrom)}・${expires}`;
  }

  return expires;
}

/**
 * 値引きの中身を 1 行の文言にする。
 *
 * @param coupon - 保有クーポン
 * @returns 範囲と購入額の下限を添えた文言
 */
function conditionOf(coupon: HeldCoupon): string {
  const scope = `${COUPON_SCOPE_NAME[coupon.scopeKind]}が対象`;

  return coupon.minPurchaseAmount === null
    ? scope
    : `${scope}・購入額 ${formatMoney(coupon.minPurchaseAmount)} 以上`;
}

/**
 * 保有クーポンを状態つきで並べる。
 *
 * @remarks
 * 読むための一覧なので、行は押せません。状態の呼び名の意味は `holding-status.ts` の
 * `HOLDING_STATUS_NAME` が持ちます。
 *
 * @param props - 受け取る内容。個々の意味は {@link CouponListProps} の各メンバーが持つ。
 * @see Storybook `Features/Coupons/Wallet/CouponList`
 */
export const CouponList = withPartSpan(
  "features/coupons/wallet/ui/coupon-list/coupon-list",
  ({ coupons, now }: CouponListProps) => {
    if (coupons.length === 0) {
      return (
        <FeedbackState
          description={EMPTY_DESCRIPTION}
          kind={FEEDBACK_STATE_KIND.EMPTY}
          title={EMPTY_TITLE}
        />
      );
    }

    return (
      <List aria-label={LIST_LABEL} className="gap-3">
        {coupons.map((coupon) => {
          const status = holdingStatusAt(coupon, now);
          const cap = formatCouponDiscountCap(coupon.discount);

          return (
            <ListItem key={coupon.id} variant={LIST_ITEM_VARIANT.OUTLINE}>
              <ListItemContent>
                <ListItemTitle className="flex flex-wrap items-center gap-2">
                  <Badge variant={STATUS_VARIANT[status]}>{HOLDING_STATUS_NAME[status]}</Badge>
                  <span>
                    {formatCouponDiscount(coupon.discount)}
                    {cap === undefined ? "" : `（${cap}）`}
                  </span>
                </ListItemTitle>
                <ListItemDescription>{conditionOf(coupon)}</ListItemDescription>
                <ListItemDescription>{timingOf(coupon, status)}</ListItemDescription>
              </ListItemContent>
            </ListItem>
          );
        })}
      </List>
    );
  },
);
