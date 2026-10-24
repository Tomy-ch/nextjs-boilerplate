import type { Campaign } from "@/model/campaign/campaign";

/**
 * キャンペーンの配布の状態。
 *
 * @remarks
 * **契約は状態を返しません。** 返すのは配布期間の両端と停止した日時で、いまどれに当たるかは
 * 「いま」と突き合わせて決まります。
 */
export const DISTRIBUTION_STATUS = {
  /** 停止した。期間に関係なく、以後は配らない。 */
  SUSPENDED: "suspended",
  /** 配布期間の開始より前。 */
  UPCOMING: "upcoming",
  /** 配布期間の中。 */
  ACTIVE: "active",
  /** 配布期間の終了を過ぎた。 */
  ENDED: "ended",
} as const;

/** {@link DISTRIBUTION_STATUS} のいずれか。 */
export type DistributionStatus = (typeof DISTRIBUTION_STATUS)[keyof typeof DISTRIBUTION_STATUS];

/** 状態の呼び名。 */
export const DISTRIBUTION_STATUS_NAME = {
  [DISTRIBUTION_STATUS.SUSPENDED]: "停止",
  [DISTRIBUTION_STATUS.UPCOMING]: "配布前",
  [DISTRIBUTION_STATUS.ACTIVE]: "配布中",
  [DISTRIBUTION_STATUS.ENDED]: "期間外",
} as const satisfies Readonly<Record<DistributionStatus, string>>;

/**
 * キャンペーンが、いまどの状態にあるかを決める。
 *
 * @remarks
 * **停止は期間より先に立ちます。** 停止は取り消せない事実で、期間のどこに居ても配布を止めています。
 *
 * 配布期間は開始を含み終了を含まない半開区間です（契約）。終了の時刻ちょうどは期間外です。
 *
 * 「いま」は引数で受け取ります。ここで時計を読むと、検証でも画面の組み立てでも結果を固定できません。
 *
 * @param campaign - 判定するキャンペーン
 * @param now - 判定の基準にする時刻
 * @returns 配布の状態
 */
export function toDistributionStatus(
  campaign: Pick<Campaign, "startsAt" | "endsAt" | "suspendedAt">,
  now: Date,
): DistributionStatus {
  if (campaign.suspendedAt !== null) return DISTRIBUTION_STATUS.SUSPENDED;

  const at = now.getTime();

  if (at < Date.parse(campaign.startsAt)) return DISTRIBUTION_STATUS.UPCOMING;
  if (at < Date.parse(campaign.endsAt)) return DISTRIBUTION_STATUS.ACTIVE;

  return DISTRIBUTION_STATUS.ENDED;
}
