"use client";

import {
  type CouponFormRead,
  type CouponFormValues,
  useCouponFormValues,
} from "../../use-coupon-form-values";
import { EMPTY_CAMPAIGN_OWN_VALUES, submissionOf, toCampaignDraft } from "./campaign-rules";
import type { CampaignOwnField } from "./form-state";

/** 画面が持つ入力の状態と、その操作。 */
export type CampaignFormValues = Omit<CouponFormValues<CampaignOwnField>, "reset">;

/**
 * 打たれている値を、日時を瞬間へ確定させてからキャンペーンの判定に掛ける。
 *
 * @param own - キャンペーン自身の項目として打たれている値
 * @param discount - 値引きとして打たれている値
 * @param scope - 範囲として選ばれている値
 * @returns 組めた内容か、項目ごとの文言
 */
const readCampaign: CouponFormRead<CampaignOwnField> = (own, discount, scope) =>
  toCampaignDraft(submissionOf(own, discount, scope));

/**
 * 入力の値を画面が持つ。
 *
 * @remarks
 * **入力欄に任せず state で持ちます。** 確認の面が送るときに載せ直すためと、弾かれた送信のあとも
 * 書きかけを残すためです。
 *
 * 関係の誤り（配布終了が開始より前、など）は相手の項目を直しても消えます。確認を開く操作は
 * {@link CampaignFormValues.touchAll} で全項目に印を付け、残っている誤りをまとめて出します。
 *
 * 規則は [`campaign-rules`](./campaign-rules.ts) が持ち、受け取る側の Server Action も同じものを
 * 通ります。
 *
 * @returns 画面が持つ入力の状態と、その操作
 */
export function useCampaignValues(): CampaignFormValues {
  return useCouponFormValues(EMPTY_CAMPAIGN_OWN_VALUES, readCampaign);
}
