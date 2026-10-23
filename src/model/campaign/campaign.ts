import * as z from "zod/mini";

import type { CouponDiscount, CouponScopeKind } from "../coupon/coupon";

/**
 * キャンペーンの識別子を確定させるスキーマ。
 *
 * @remarks
 * 外へは出しません。確定させる口は {@link toCampaignId} だけです。
 */
const campaignIdSchema = z.string().brand<"campaign">();

/**
 * キャンペーンを指す識別子。
 *
 * @remarks
 * 素の `string` を代入できない形にしてあります。ほかの識別子と同じく UUID の文字列で、取り違えても
 * 型では止まらないためです。
 */
export type CampaignId = z.infer<typeof campaignIdSchema>;

/**
 * 文字列をキャンペーンの識別子として確定させる。
 *
 * @remarks
 * **呼んでよいのは境界だけ**です。`adapters` の検証の出口とフォームの受け取りで 1 度だけ通します。
 *
 * @param value - 確定させる文字列
 * @returns キャンペーンの識別子
 */
export function toCampaignId(value: string): CampaignId {
  return campaignIdSchema.parse(value);
}

/**
 * 管理の一覧に並べるキャンペーン 1 件。
 *
 * @remarks
 * 日時は契約が返す ISO の文字列のまま持ちます。配布期間は開始を含み終了を含まない半開区間です。
 *
 * 配るクーポンの最低購入金額・使えるようになる日時・1 人あたりの上限は持ちません。一覧が答えるのは
 * 「どれが、いま配られていて、あと何枚残っているか」であり、配る 1 枚の細かな条件ではないためです。
 */
export type Campaign = {
  readonly id: CampaignId;
  /** 正規化済みのコード。前後の空白を落とし大文字に揃えてある。 */
  readonly code: string;
  readonly discount: CouponDiscount;
  readonly scopeKind: CouponScopeKind;
  /** 配布期間の開始。この時刻ちょうどを含む。 */
  readonly startsAt: string;
  /** 配布期間の終了。この時刻ちょうどは含まない。 */
  readonly endsAt: string;
  /** 配るクーポンの有効期限。 */
  readonly couponExpiresAt: string;
  /** 配れる総枚数。 */
  readonly totalLimit: number;
  /** 配った枚数。クーポンが未使用へ戻っても減らない。 */
  readonly issuedCount: number;
  /** 停止した日時。停止していなければ null。 */
  readonly suspendedAt: string | null;
};
