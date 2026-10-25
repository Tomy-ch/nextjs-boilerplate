import { COUPON_SCOPE_NAME } from "@/model/coupon/coupon";

import { COUPON_DISCOUNT_FORM_NAMES, type CouponDiscountValues } from "../../coupon-discount";
import {
  type CampaignOwnValues,
  type CampaignSubmission,
  normalizeCampaignCode,
  submissionOf,
} from "./campaign-rules";
import { COUPON_SCOPE_FORM_NAMES, type CouponScopeValues } from "./coupon-scope";
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
 * `datetime-local` の壁時計の値を、読むための綴りへ直す。
 *
 * @param wallClock - `datetime-local` の値
 * @returns `2026/10/01 10:00` の形。空なら空
 */
function readableWallClock(wallClock: string): string {
  return wallClock.replace(/^(\d{4})-(\d{2})-(\d{2})T/, "$1/$2/$3 ");
}

/**
 * 送る項目と値を並べる。
 *
 * @remarks
 * **種別に応じて要らない項目は載せません。** 定額の上限や、全体の範囲の対象は、欄が隠れていても
 * 画面は値を持ち続けます。載せると、見えていない値が送られます。
 *
 * @param submission - 日時を瞬間へ確定させた一式
 * @returns 送る項目と値
 */
function fieldsOf(submission: CampaignSubmission): CampaignConfirmation["fields"] {
  const { discount, own, scope } = submission;
  const fields: (readonly [string, string])[] = [
    [CAMPAIGN_FORM_NAMES.code, own.code],
    [CAMPAIGN_FORM_NAMES.startsAt, own.startsAt],
    [CAMPAIGN_FORM_NAMES.endsAt, own.endsAt],
    [CAMPAIGN_FORM_NAMES.couponExpiresAt, own.couponExpiresAt],
    [CAMPAIGN_FORM_NAMES.usableFrom, own.usableFrom],
    [CAMPAIGN_FORM_NAMES.totalLimit, own.totalLimit],
    [CAMPAIGN_FORM_NAMES.perUserLimit, own.perUserLimit],
    [CAMPAIGN_FORM_NAMES.minPurchaseAmount, own.minPurchaseAmount],
    [COUPON_DISCOUNT_FORM_NAMES.kind, discount.kind],
    [COUPON_DISCOUNT_FORM_NAMES.value, discount.value],
    [COUPON_SCOPE_FORM_NAMES.kind, scope.kind],
  ];

  if (discount.kind === "rate") {
    fields.push([COUPON_DISCOUNT_FORM_NAMES.maxAmount, discount.maxAmount]);
  }

  if (scope.kind === "category") {
    fields.push([COUPON_SCOPE_FORM_NAMES.categoryId, scope.categoryId]);
  }

  if (scope.kind === "product") {
    fields.push([COUPON_SCOPE_FORM_NAMES.productId, scope.productId]);
  }

  return fields;
}

/**
 * 値引きを、確認で読む文に直す。
 *
 * @param discount - 打たれた値引き
 * @returns 復唱の文
 */
function discountDetail(discount: CouponDiscountValues): string {
  if (discount.kind === "flat") {
    return `${discount.value} ドル引き`;
  }

  return discount.maxAmount === ""
    ? `${discount.value}% 引き`
    : `${discount.value}% 引き（1 回 ${discount.maxAmount} ドルまで）`;
}

/**
 * 範囲を、確認で読む文に直す。
 *
 * @param scope - 選ばれた範囲
 * @param categoryName - 選ばれたカテゴリの名前。カテゴリでなければ使わない
 * @returns 復唱の文
 */
function scopeDetail(scope: CouponScopeValues, categoryName: string): string {
  switch (scope.kind) {
    case "category":
      return `${COUPON_SCOPE_NAME.category}：${categoryName}`;
    case "product":
      return `${COUPON_SCOPE_NAME.product}：${scope.productName}`;
    default:
      return COUPON_SCOPE_NAME.all;
  }
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
