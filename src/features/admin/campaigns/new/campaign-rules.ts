import {
  CAMPAIGN_CODE_MAX_LENGTH,
  CAMPAIGN_CODE_MIN_LENGTH,
  CAMPAIGN_CODE_PATTERN,
  CAMPAIGN_LIMIT_MIN,
} from "@/adapters/client/api/campaign-limits";
import type { CampaignDraft } from "@/model/campaign/campaign-draft";

import {
  type CouponDiscountValues,
  toCouponDiscount,
  toMinorUnitAmount,
} from "../../coupon-discount";
import { type CouponScopeValues, toCouponScope } from "./coupon-scope";
import type { CampaignOwnField, CreateCampaignField } from "./form-state";

/** 枚数として読める綴り。符号も小数も持たない。 */
const COUNT_SPELLING = /^\d+$/;

/** 日時を受け持つ項目。画面では壁時計の値、送るときは瞬間の文字列で持つ。 */
const CAMPAIGN_DATE_FIELDS = [
  "startsAt",
  "endsAt",
  "couponExpiresAt",
  "usableFrom",
] as const satisfies readonly CampaignOwnField[];

/** キャンペーン自身の項目として打たれている値。すべて文字列で持つ。 */
export type CampaignOwnValues = Readonly<Record<CampaignOwnField, string>>;

/**
 * 判定に掛ける一式。
 *
 * @remarks
 * 日時は**瞬間の文字列**で持ちます。画面が打たれた壁時計の値を入力した人の時間帯で確定させてから
 * ここへ渡し、受け取る側は運ばれてきた瞬間をそのまま読みます。どちらも同じ判定を通ります。
 */
export type CampaignSubmission = {
  readonly own: CampaignOwnValues;
  readonly discount: CouponDiscountValues;
  readonly scope: CouponScopeValues;
};

/** まだ何も打っていないキャンペーン自身の項目。既定値を置かない。 */
export const EMPTY_CAMPAIGN_OWN_VALUES: CampaignOwnValues = {
  code: "",
  startsAt: "",
  endsAt: "",
  couponExpiresAt: "",
  usableFrom: "",
  totalLimit: "",
  perUserLimit: "",
  minPurchaseAmount: "",
};

/** コードが読めなかったときの文言。 */
export const CAMPAIGN_CODE_INVALID_MESSAGE = `キャンペーンコードは英数字とハイフンで ${CAMPAIGN_CODE_MIN_LENGTH} 〜 ${CAMPAIGN_CODE_MAX_LENGTH} 文字で入力してください。`;

/** 必須の日時が無いときの文言。 */
export const CAMPAIGN_DATE_MISSING_MESSAGE = "日時を入力してください。";

/** 配布終了が配布開始より後でないときの文言。 */
export const CAMPAIGN_ENDS_BEFORE_START_MESSAGE = "配布終了は配布開始より後にしてください。";

/** 有効期限が配布終了より後でないときの文言。 */
export const CAMPAIGN_EXPIRES_BEFORE_END_MESSAGE =
  "クーポンの有効期限は配布終了より後にしてください。期間の終わりぎわに受け取った人へ、失効したクーポンを渡さないためです。";

/** 利用開始が有効期限より前でないときの文言。 */
export const CAMPAIGN_USABLE_AFTER_EXPIRY_MESSAGE =
  "クーポンの利用開始は有効期限より前にしてください。";

/** 枚数が読めなかったときの文言。 */
export const CAMPAIGN_LIMIT_INVALID_MESSAGE = `${CAMPAIGN_LIMIT_MIN} 以上の整数で入力してください。`;

/** 1 人あたりの上限が総枚数を超えるときの文言。 */
export const CAMPAIGN_PER_USER_OVER_TOTAL_MESSAGE =
  "1 人あたりの上限は総枚数の上限以下にしてください。";

/** 最低購入額が読めなかったときの文言。 */
export const CAMPAIGN_MIN_PURCHASE_INVALID_MESSAGE =
  "最低購入額は 50 や 49.99 のように、0 より大きいドルの額を小数第 2 位までで入力してください。";

/**
 * 打たれたコードを、保存される綴りへ揃える。
 *
 * @remarks
 * 接続先と同じ規則（前後の空白を落とし、大文字へ揃える）です。確認で見せる綴りと送る綴りを
 * 一致させるため、送る前にここで揃えます。入力中の欄は書き換えません。
 *
 * @param code - 打たれたコード
 * @returns 保存される綴り
 */
export function normalizeCampaignCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * `datetime-local` の壁時計の値を、入力した人の時間帯で瞬間の文字列へ確定させる。
 *
 * @remarks
 * **ブラウザで呼びます。** 時差を持たない日時の綴りは、ECMAScript が実行環境の時間帯で読むと
 * 定めています。ブラウザで読めばそれが入力した人の時間帯になり、日時ごとにその時点の時差で
 * 解かれるため、夏時間をまたぐ期間でもずれません。サーバで読むと配備先の時間帯になるため、
 * 確定させた瞬間だけを送ります（[`docs/design/rendering.md`](../../../../../docs/design/rendering.md)）。
 *
 * @param wallClock - `datetime-local` の値
 * @returns ISO 8601 の瞬間。空か読めなければ空文字
 */
export function wallClockToInstant(wallClock: string): string {
  if (wallClock === "") {
    return "";
  }

  const instant = new Date(wallClock);

  return Number.isNaN(instant.getTime()) ? "" : instant.toISOString();
}

/**
 * 画面が持つ値から、判定に掛ける一式を組む。日時は {@link wallClockToInstant} で確定させる。
 *
 * @param own - キャンペーン自身の項目として打たれている値
 * @param discount - 値引きとして打たれている値
 * @param scope - 範囲として選ばれている値
 * @returns 判定に掛ける一式
 */
export function submissionOf(
  own: CampaignOwnValues,
  discount: CouponDiscountValues,
  scope: CouponScopeValues,
): CampaignSubmission {
  const instants: Partial<Record<CampaignOwnField, string>> = {};

  for (const field of CAMPAIGN_DATE_FIELDS) {
    instants[field] = wallClockToInstant(own[field]);
  }

  return { own: { ...own, ...instants }, discount, scope };
}

/**
 * 瞬間の文字列を読む。
 *
 * @param text - ISO 8601 の瞬間
 * @returns 読めた瞬間。空か読めなければ null
 */
function instantOf(text: string): Date | null {
  if (text === "") {
    return null;
  }

  const instant = new Date(text);

  return Number.isNaN(instant.getTime()) ? null : instant;
}

/**
 * 枚数を読む。
 *
 * @param text - 打たれた枚数
 * @returns 枚数。読めないか下限を下回れば null
 */
function countOf(text: string): number | null {
  if (!COUNT_SPELLING.test(text)) {
    return null;
  }

  const count = Number(text);

  return Number.isSafeInteger(count) && count >= CAMPAIGN_LIMIT_MIN ? count : null;
}

/** 判定に掛けた結果。 */
export type CampaignDraftReading =
  | { readonly ok: true; readonly draft: CampaignDraft }
  | {
      readonly ok: false;
      readonly errors: Readonly<Partial<Record<CreateCampaignField, string>>>;
    };

/**
 * 判定に掛けて、定義するキャンペーンの内容を組む。
 *
 * @remarks
 * 送る前の判定と、送られてきた値の読み取りが同じこの関数を通ります。
 *
 * **期間と上限の大小関係を、送る前に出します。** 判定の正は接続先ですが、接続先が弾いた欄に
 * 返すのは項目名だけで、何と比べて誤りなのかを返しません。ここで出さなければ、どう直せばよいかが
 * 伝わりません（[`docs/rules.md`](../../../../../docs/rules.md#layers)）。過去の日時を拒むことはしません。
 * 契約がそれを宣言していないためです。
 *
 * 関係の誤りは、後ろに来るべき項目の側へ付けます（配布終了・有効期限・利用開始・1 人あたりの
 * 上限）。前の項目を直しても後ろの項目を直しても消えます。
 *
 * @param submission - 判定に掛ける一式
 * @returns 組めた内容。組めなければ項目ごとの文言
 */
export function toCampaignDraft(submission: CampaignSubmission): CampaignDraftReading {
  const { own } = submission;
  const code = normalizeCampaignCode(own.code);
  const codeError = codeErrorOf(code);
  const discount = toCouponDiscount(submission.discount);
  const scope = toCouponScope(submission.scope);
  const period = periodOf(own);
  const limits = limitsOf(own);

  if (codeError !== undefined || !discount.ok || !scope.ok || !period.ok || !limits.ok) {
    return {
      ok: false,
      errors: {
        ...(codeError === undefined ? {} : { code: codeError }),
        ...(discount.ok ? {} : discount.errors),
        ...(scope.ok ? {} : scope.errors),
        ...(period.ok ? {} : period.errors),
        ...(limits.ok ? {} : limits.errors),
      },
    };
  }

  return {
    ok: true,
    draft: {
      code,
      discount: discount.discount,
      scope: scope.scope,
      ...period.period,
      ...limits.limits,
    },
  };
}

/**
 * 正規化したコードが、契約の許す綴りかを見る。
 *
 * @param code - 正規化したコード
 * @returns 誤りの文言。許される綴りなら undefined
 */
function codeErrorOf(code: string): string | undefined {
  return code.length < CAMPAIGN_CODE_MIN_LENGTH ||
    code.length > CAMPAIGN_CODE_MAX_LENGTH ||
    !CAMPAIGN_CODE_PATTERN.test(code)
    ? CAMPAIGN_CODE_INVALID_MESSAGE
    : undefined;
}

/** 期間の読み取り結果。 */
type CampaignPeriodReading =
  | {
      readonly ok: true;
      readonly period: Pick<
        CampaignDraft,
        "startsAt" | "endsAt" | "couponExpiresAt" | "usableFrom"
      >;
    }
  | { readonly ok: false; readonly errors: Partial<Record<CampaignOwnField, string>> };

/**
 * 配布期間とクーポンの使える期間を読み、前後関係を見る。
 *
 * @remarks
 * 関係の誤りは後ろに来るべき項目の側へ付け、前の項目が読めなければ比べません。
 *
 * @param own - キャンペーン自身の項目として打たれている値
 * @returns 組めた期間。組めなければ項目ごとの文言
 */
function periodOf(own: CampaignOwnValues): CampaignPeriodReading {
  const errors: Partial<Record<CampaignOwnField, string>> = {};
  const startsAt = instantOf(own.startsAt);
  const endsAt = instantOf(own.endsAt);
  const couponExpiresAt = instantOf(own.couponExpiresAt);
  const usableFrom = instantOf(own.usableFrom);

  if (startsAt === null) errors.startsAt = CAMPAIGN_DATE_MISSING_MESSAGE;

  if (endsAt === null) {
    errors.endsAt = CAMPAIGN_DATE_MISSING_MESSAGE;
  } else if (startsAt !== null && endsAt <= startsAt) {
    errors.endsAt = CAMPAIGN_ENDS_BEFORE_START_MESSAGE;
  }

  if (couponExpiresAt === null) {
    errors.couponExpiresAt = CAMPAIGN_DATE_MISSING_MESSAGE;
  } else if (endsAt !== null && couponExpiresAt <= endsAt) {
    errors.couponExpiresAt = CAMPAIGN_EXPIRES_BEFORE_END_MESSAGE;
  }

  if (own.usableFrom !== "" && usableFrom === null) {
    errors.usableFrom = CAMPAIGN_DATE_MISSING_MESSAGE;
  } else if (usableFrom !== null && couponExpiresAt !== null && usableFrom >= couponExpiresAt) {
    errors.usableFrom = CAMPAIGN_USABLE_AFTER_EXPIRY_MESSAGE;
  }

  if (
    startsAt === null ||
    endsAt === null ||
    couponExpiresAt === null ||
    Object.keys(errors).length > 0
  ) {
    return { ok: false, errors };
  }

  return { ok: true, period: { startsAt, endsAt, couponExpiresAt, usableFrom } };
}

/** 上限と最低購入額の読み取り結果。 */
type CampaignLimitsReading =
  | {
      readonly ok: true;
      readonly limits: Pick<CampaignDraft, "totalLimit" | "perUserLimit" | "minPurchaseAmount">;
    }
  | { readonly ok: false; readonly errors: Partial<Record<CampaignOwnField, string>> };

/**
 * 枚数の上限と最低購入額を読み、上限どうしの大小を見る。
 *
 * @param own - キャンペーン自身の項目として打たれている値
 * @returns 組めた上限。組めなければ項目ごとの文言
 */
function limitsOf(own: CampaignOwnValues): CampaignLimitsReading {
  const errors: Partial<Record<CampaignOwnField, string>> = {};
  const totalLimit = countOf(own.totalLimit);
  const perUserLimit = countOf(own.perUserLimit);
  const minPurchaseAmount =
    own.minPurchaseAmount === "" ? null : toMinorUnitAmount(own.minPurchaseAmount);

  if (totalLimit === null) errors.totalLimit = CAMPAIGN_LIMIT_INVALID_MESSAGE;

  if (perUserLimit === null) {
    errors.perUserLimit = CAMPAIGN_LIMIT_INVALID_MESSAGE;
  } else if (totalLimit !== null && perUserLimit > totalLimit) {
    errors.perUserLimit = CAMPAIGN_PER_USER_OVER_TOTAL_MESSAGE;
  }

  if (own.minPurchaseAmount !== "" && minPurchaseAmount === null) {
    errors.minPurchaseAmount = CAMPAIGN_MIN_PURCHASE_INVALID_MESSAGE;
  }

  if (totalLimit === null || perUserLimit === null || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, limits: { totalLimit, perUserLimit, minPurchaseAmount } };
}
