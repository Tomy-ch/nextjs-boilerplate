import {
  BADGE_VARIANT,
  type BadgeVariant,
} from "@/components/design-system/display/badge/badge.definition";

import { DISTRIBUTION_STATUS, type DistributionStatus } from "./distribution-status";

/**
 * 配布の状態に対応する見た目。
 *
 * @remarks
 * 色は扱いの区分に付けます。配っている = 塗り、まだ始まっていない = 注意色、終わった = 枠線だけ、
 * 停止した = 明暗の反転。停止は取り消せない確定した扱いで、期間が終わっただけの行より強く出します
 * （商品一覧の廃番と同じ扱い）。
 *
 * バッジは状態名も出すので、色だけで区別させません。
 */
const STATUS_TONE = {
  [DISTRIBUTION_STATUS.SUSPENDED]: BADGE_VARIANT.DEFAULT,
  [DISTRIBUTION_STATUS.UPCOMING]: BADGE_VARIANT.WARNING,
  [DISTRIBUTION_STATUS.ACTIVE]: BADGE_VARIANT.SECONDARY,
  [DISTRIBUTION_STATUS.ENDED]: BADGE_VARIANT.OUTLINE,
} as const satisfies Readonly<Record<DistributionStatus, BadgeVariant>>;

/**
 * 配布の状態から、バッジの見た目を選ぶ。
 *
 * @param status - 配布の状態
 * @returns 対応するバッジの見た目
 */
export function toDistributionStatusTone(status: DistributionStatus): BadgeVariant {
  return STATUS_TONE[status];
}
