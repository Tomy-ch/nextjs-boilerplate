import type { HeldCoupon } from "@/model/coupon/coupon";

/** 保有クーポンの状態。 */
export type HoldingStatus = "unused" | "used" | "expired" | "notStarted";

/** 状態ごとの呼び名。券そのものの状態で、いまのカートで使えるかは言わない（それは購入の手続きが答える）。 */
export const HOLDING_STATUS_NAME: Readonly<Record<HoldingStatus, string>> = {
  unused: "未使用",
  used: "使用済み",
  expired: "期限切れ",
  notStarted: "利用開始前",
};

/**
 * 保有クーポンの状態を、ある時刻に照らして決める。
 *
 * @remarks
 * 契約は状態を返さず、3 つの時刻を判定のたびに現在時刻と突き合わせるよう求めています。境界は
 * 契約のとおり、失効は `expiresAt` ちょうどから、利用開始は `usableFrom` ちょうどからです。
 *
 * **複数が同時に成り立つときは、もう変わらない状態を先に言います。** 使用済みは取り消せず、
 * 失効は時間が経っても戻りません。利用開始前は時間が経てば解けます。
 *
 * @param coupon - 判定する保有クーポン
 * @param now - 照らす時刻
 * @returns その時刻での状態
 */
export function holdingStatusAt(coupon: HeldCoupon, now: Date): HoldingStatus {
  if (coupon.usedAt !== null) {
    return "used";
  }

  if (now.getTime() >= coupon.expiresAt.getTime()) {
    return "expired";
  }

  if (coupon.usableFrom !== null && now.getTime() < coupon.usableFrom.getTime()) {
    return "notStarted";
  }

  return "unused";
}
