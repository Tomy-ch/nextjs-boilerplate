import { COUPON_DISCOUNT_VALUE_PATTERN } from "@/adapters/client/api/coupon-limits";
import type { CouponDiscount } from "@/model/coupon/coupon";

/** 小数点を左へずらす桁数。百分率を乗数へ写すため 2 桁。 */
const PERCENT_SHIFT = 2;

/** 主単位の額が取れる綴り。最小単位（セント）より細かい桁を持たない。 */
const MAJOR_UNIT_SPELLING = /^(\d+)(?:\.(\d{1,2}))?$/;

/** 主単位 1 に対する最小単位の数。 */
const MINOR_UNITS_PER_MAJOR = 100;

/** 値引きの入力欄の名前。送る側と読む側が同じ綴りを見る。 */
export const COUPON_DISCOUNT_FORM_NAMES = {
  /** 値引きの決まり方。 */
  kind: "discountKind",
  /** 定額の額（主単位）か、定率の率（百分率）。打たれたまま載る。 */
  value: "discountValue",
  /** 定率の値引きが 1 回に引ける額の上限（主単位）。任意。 */
  maxAmount: "discountMaxAmount",
} as const;

/** 値引きの入力欄のうち、入力した人が直せる項目。 */
export type CouponDiscountField =
  (typeof COUPON_DISCOUNT_FORM_NAMES)[keyof typeof COUPON_DISCOUNT_FORM_NAMES];

/** 値引きとして打たれている値。種別は選ぶまで空。 */
export type CouponDiscountValues = {
  readonly kind: "" | CouponDiscount["kind"];
  readonly value: string;
  readonly maxAmount: string;
};

/** まだ何も打っていない値引き。既定値を置かない。 */
export const EMPTY_COUPON_DISCOUNT_VALUES: CouponDiscountValues = {
  kind: "",
  value: "",
  maxAmount: "",
};

/** 値引きの種別ごとの呼び名。 */
export const COUPON_DISCOUNT_KIND_NAME: Readonly<Record<CouponDiscount["kind"], string>> = {
  flat: "定額",
  rate: "定率",
};

/** 値引きの種別が選ばれていないときの文言。 */
export const COUPON_DISCOUNT_KIND_MISSING_MESSAGE = "値引きの種類を選んでください。";

/** 値引き率が読めなかったときの文言。 */
export const COUPON_DISCOUNT_RATE_INVALID_MESSAGE =
  "値引き率は 10 や 12.5 のように、% を付けない数で入力してください。";

/** 値引き率が 0 より大きく 100 以下でないときの文言。 */
export const COUPON_DISCOUNT_RATE_OUT_OF_RANGE_MESSAGE =
  "値引き率は 0 より大きく 100 以下で入力してください。";

/** 値引き額が読めなかったときの文言。 */
export const COUPON_DISCOUNT_FLAT_INVALID_MESSAGE =
  "値引き額は 5 や 5.50 のように、0 より大きいドルの額を小数第 2 位までで入力してください。";

/** 値引きの上限額が読めなかったときの文言。 */
export const COUPON_DISCOUNT_MAX_AMOUNT_INVALID_MESSAGE =
  "上限額は 20 や 20.50 のように、0 より大きいドルの額を小数第 2 位までで入力してください。";

/**
 * 百分率で打たれた値引き率を、契約が受け付ける乗数の decimal 文字列へ写す。
 *
 * @remarks
 * 綴りは契約の形（{@link COUPON_DISCOUNT_VALUE_PATTERN}）で先に照らします。
 * 0 より大きく 1 以下という範囲はここでは照らしません。範囲を画面で先に出すかは使う画面が決め、
 * 出す画面は {@link toCouponDiscount} を通ります。
 *
 * @example
 * ```ts
 * import { toCouponDiscountRate } from "@/features/admin/coupon-discount";
 *
 * toCouponDiscountRate("10"); // "0.10"
 * toCouponDiscountRate("12.5"); // "0.125"
 * toCouponDiscountRate("100"); // "1.00"
 * toCouponDiscountRate("5"); // "0.05"
 * toCouponDiscountRate("10%"); // null
 * ```
 *
 * @param percent - 打たれた百分率
 * @returns 乗数の decimal 文字列。綴りが読めなければ null
 */
export function toCouponDiscountRate(percent: string): string | null {
  if (!COUPON_DISCOUNT_VALUE_PATTERN.test(percent)) {
    return null;
  }

  const dot = percent.indexOf(".");
  const integer = dot === -1 ? percent : percent.slice(0, dot);
  const fraction = dot === -1 ? "" : percent.slice(dot + 1);
  const padded = integer.padStart(PERCENT_SHIFT + 1, "0");
  const head = padded.slice(0, -PERCENT_SHIFT).replace(/^0+(?=\d)/, "");
  const tail = `${padded.slice(-PERCENT_SHIFT)}${fraction}`;

  return `${head}.${tail}`;
}

/**
 * 主単位で打たれた額を、最小単位の整数へ写す。
 *
 * @remarks
 * **浮動小数を通しません。** `12.3 * 100` は `1230.0000000000002` になるため、綴りの整数部と
 * 小数部を別々に読みます。最小単位より細かい桁は受け付けません（端数の扱いを画面が決めない）。
 *
 * @example
 * ```ts
 * import { toMinorUnitAmount } from "@/features/admin/coupon-discount";
 *
 * toMinorUnitAmount("20"); // 2000
 * toMinorUnitAmount("12.3"); // 1230
 * toMinorUnitAmount("0.01"); // 1
 * toMinorUnitAmount("1.005"); // null
 * toMinorUnitAmount("0"); // null
 * ```
 *
 * @param amount - 主単位で打たれた額
 * @returns 最小単位の整数。読めないか 0 以下なら null
 */
export function toMinorUnitAmount(amount: string): number | null {
  const matched = MAJOR_UNIT_SPELLING.exec(amount);

  if (matched === null) {
    return null;
  }

  const [, integer, fraction] = matched;
  const minor =
    Number(integer) * MINOR_UNITS_PER_MAJOR + Number((fraction ?? "").padEnd(PERCENT_SHIFT, "0"));

  return minor > 0 && Number.isSafeInteger(minor) ? minor : null;
}

/** 0 より大きく 1 以下の乗数の綴り。`toCouponDiscountRate` が返す「整数部.小数部」の形だけを読む。 */
const RATE_IN_RANGE = /^(?:0\.\d*[1-9]\d*|1\.0+)$/;

/**
 * decimal 文字列が 0 より大きく 1 以下か。
 *
 * @param rate - 符号の無い decimal 文字列
 * @returns 範囲に収まれば true
 */
function isRateInRange(rate: string): boolean {
  return RATE_IN_RANGE.test(rate);
}

/** 打たれた値引きを読んだ結果。 */
export type CouponDiscountReading =
  | { readonly ok: true; readonly discount: CouponDiscount }
  | {
      readonly ok: false;
      readonly errors: Readonly<Partial<Record<CouponDiscountField, string>>>;
    };

/**
 * 打たれた値引きを、契約が受け付ける値引きとして読む。
 *
 * @remarks
 * 送る前の判定と、送られてきた値の読み取りが同じこの関数を通ります。
 *
 * **範囲（定率は 0 より大きく 100% 以下、額は 0 より大きい）も照らします。** 契約は文章でしか
 * 宣言していませんが、接続先は弾いた項目を名指ししないため、ここで出さなければどの欄の誤りかが
 * 伝わりません（[`docs/rules.md`](../../../docs/rules.md#layers)）。判定の正は接続先です。
 *
 * 定額のときの上限は読みません。契約は定額に上限を付けると拒むため、画面は欄を出さず、
 * 値も送りません。
 *
 * @param values - 打たれている値
 * @returns 読めた値引き。読めなければ項目ごとの文言
 */
export function toCouponDiscount(values: CouponDiscountValues): CouponDiscountReading {
  const {
    kind: kindField,
    maxAmount: maxAmountField,
    value: valueField,
  } = COUPON_DISCOUNT_FORM_NAMES;

  if (values.kind === "") {
    return { ok: false, errors: { [kindField]: COUPON_DISCOUNT_KIND_MISSING_MESSAGE } };
  }

  if (values.kind === "flat") {
    return toMinorUnitAmount(values.value) === null
      ? { ok: false, errors: { [valueField]: COUPON_DISCOUNT_FLAT_INVALID_MESSAGE } }
      : { ok: true, discount: { kind: "flat", value: values.value } };
  }

  const rate = toCouponDiscountRate(values.value);
  const maxAmount = values.maxAmount === "" ? null : toMinorUnitAmount(values.maxAmount);
  const errors: Partial<Record<CouponDiscountField, string>> = {};

  if (rate === null) {
    errors[valueField] = COUPON_DISCOUNT_RATE_INVALID_MESSAGE;
  } else if (!isRateInRange(rate)) {
    errors[valueField] = COUPON_DISCOUNT_RATE_OUT_OF_RANGE_MESSAGE;
  }

  if (values.maxAmount !== "" && maxAmount === null) {
    errors[maxAmountField] = COUPON_DISCOUNT_MAX_AMOUNT_INVALID_MESSAGE;
  }

  if (rate === null || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, discount: { kind: "rate", value: rate, maxAmount } };
}

/**
 * 送信された値を文字列として取り出す。
 *
 * @param formData - 送信された form の値
 * @param name - 項目の名前
 * @returns 文字列の値。載っていないかファイルなら空文字
 */
function textOf(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

/**
 * 送られてきた form から、値引きとして打たれていた値を取り出す。
 *
 * @param formData - 送信された form の値
 * @returns 打たれていた値。種別が読めなければ空
 */
export function readCouponDiscountValues(formData: FormData): CouponDiscountValues {
  const kind = textOf(formData, COUPON_DISCOUNT_FORM_NAMES.kind);

  return {
    kind: kind === "flat" || kind === "rate" ? kind : "",
    value: textOf(formData, COUPON_DISCOUNT_FORM_NAMES.value),
    maxAmount: textOf(formData, COUPON_DISCOUNT_FORM_NAMES.maxAmount),
  };
}
