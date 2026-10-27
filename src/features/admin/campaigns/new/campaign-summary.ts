import type { CouponDiscountValues } from "../../coupon-discount";
import type { CouponScopeValues } from "../../coupon-scope";
import {
  couponFieldsOf,
  discountDetail,
  readableWallClock,
  scopeDetail,
} from "../../coupon-summary";
import {
  type CampaignOwnValues,
  type CampaignSubmission,
  normalizeCampaignCode,
  submissionOf,
} from "./campaign-rules";
import { CAMPAIGN_FORM_NAMES } from "./form-names";

/** 確認に並べる 1 行。 */
type CampaignSummaryRow = { readonly term: string; readonly detail: string };

/** 確認に要るもの一式。 */
export type CampaignConfirmation = {
  /** 送る項目と値。確認の form が hidden で載せる。 */
  readonly fields: readonly (readonly [name: string, value: string])[];
  /** 人に見せる復唱。 */
  readonly summary: readonly CampaignSummaryRow[];
};

/**
 * 送る項目と値を並べる。
 *
 * @param submission - 日時を瞬間へ確定させた一式
 * @returns 送る項目と値
 */
function fieldsOf(submission: CampaignSubmission): CampaignConfirmation["fields"] {
  const { discount, own, scope } = submission;
  return [
    [CAMPAIGN_FORM_NAMES.code, own.code],
    [CAMPAIGN_FORM_NAMES.startsAt, own.startsAt],
    [CAMPAIGN_FORM_NAMES.endsAt, own.endsAt],
    [CAMPAIGN_FORM_NAMES.couponExpiresAt, own.couponExpiresAt],
    [CAMPAIGN_FORM_NAMES.usableFrom, own.usableFrom],
    [CAMPAIGN_FORM_NAMES.totalLimit, own.totalLimit],
    [CAMPAIGN_FORM_NAMES.perUserLimit, own.perUserLimit],
    [CAMPAIGN_FORM_NAMES.minPurchaseAmount, own.minPurchaseAmount],
    ...couponFieldsOf(discount, scope),
  ];
}

/**
 * 確認に要るもの（送る値と、人に見せる復唱）を揃える。
 *
 * @remarks
 * 復唱のコードは**保存される綴り**で見せます。打った綴りのまま見せると、確認で読んだ綴りと
 * 保存された綴りが食い違います。日時は打った壁時計の値のまま見せ、送る値は瞬間へ確定させます。
 *
 * 判定を通った値だけを渡します。ここでは読めない値を考えません。
 *
 * @param own - キャンペーン自身の項目として打たれている値
 * @param discount - 値引きとして打たれている値
 * @param scope - 範囲として選ばれている値
 * @param categoryName - 選ばれたカテゴリの名前
 * @returns 確認に要るもの一式
 */
export function confirmationOf(
  own: CampaignOwnValues,
  discount: CouponDiscountValues,
  scope: CouponScopeValues,
  categoryName: string,
): CampaignConfirmation {
  return {
    fields: fieldsOf(submissionOf(own, discount, scope)),
    summary: [
      { term: "キャンペーンコード", detail: normalizeCampaignCode(own.code) },
      { term: "値引き", detail: discountDetail(discount) },
      { term: "値引きの対象", detail: scopeDetail(scope, categoryName) },
      {
        term: "配布期間",
        detail: `${readableWallClock(own.startsAt)} 〜 ${readableWallClock(own.endsAt)}`,
      },
      { term: "クーポンの有効期限", detail: readableWallClock(own.couponExpiresAt) },
      {
        term: "クーポンの利用開始",
        detail: own.usableFrom === "" ? "受け取った時点から" : readableWallClock(own.usableFrom),
      },
      {
        term: "上限",
        detail: `総 ${own.totalLimit} 枚・1 人 ${own.perUserLimit} 枚まで`,
      },
      {
        term: "最低購入額",
        detail: own.minPurchaseAmount === "" ? "なし" : `${own.minPurchaseAmount} ドル以上`,
      },
    ],
  };
}
