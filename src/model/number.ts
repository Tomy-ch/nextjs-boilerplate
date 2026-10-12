import { DEFAULT_LOCALE } from "./locale";

const formatters = new Map<string, Intl.NumberFormat>();

/**
 * locale ごとの `Intl.NumberFormat` を使い回す。
 *
 * @param locale - 用いる locale
 * @returns その locale の `Intl.NumberFormat`
 */
function formatterOf(locale: string): Intl.NumberFormat {
  let formatter = formatters.get(locale);

  if (formatter === undefined) {
    formatter = new Intl.NumberFormat(locale);
    formatters.set(locale, formatter);
  }

  return formatter;
}

/**
 * 数を locale に沿った桁区切りの表記にする。
 *
 * @remarks
 * 金額には使いません。金額は通貨ごとの小数桁と記号を持つので `money.ts` が整えます。
 *
 * @param value - 表示する数
 * @param locale - 用いる locale。省略時は {@link DEFAULT_LOCALE}
 * @returns locale に沿って整形した文字列
 */
export function formatNumber(value: number, locale: string = DEFAULT_LOCALE): string {
  return formatterOf(locale).format(value);
}

/** 契約が decimal 文字列に置く形。符号と指数を持たない十進表記。 */
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

/**
 * 文字列が {@link DECIMAL_PATTERN} の形か。
 *
 * @param value - 確かめる文字列
 * @returns 十進表記なら `true`
 */
function isDecimal(value: string): value is `${number}` {
  return DECIMAL_PATTERN.test(value);
}

/**
 * decimal 文字列を、数へ直さずに `Intl.NumberFormat` へ渡せる形として受け取る。
 *
 * @remarks
 * 数へ直さないのは、double へ戻した時点で桁を失うためです（`docs/rules.md`「Display and
 * Formatting」）。形は契約の pattern と同じで、値は境界の zod が先に確かめています。ここで
 * 同じ形を見るのは型を絞るためで、外れた値は別の表記へ倒さず失敗として投げます。
 *
 * @param value - 契約が返した decimal 文字列
 * @returns `Intl.NumberFormat#format` が受け取れる十進表記
 * @throws {RangeError} 十進表記でないとき
 */
export function toDecimalLiteral(value: string): `${number}` {
  if (!isDecimal(value)) {
    throw new RangeError(`decimal 文字列ではありません: ${value}`);
  }

  return value;
}

const rateFormatters = new Map<string, Intl.NumberFormat>();

/**
 * 掛ける率（`"0.10"` が 10%）を、locale に沿った百分率の表記にする。
 *
 * @remarks
 * 小数桁は丸めません。率は契約が決めた値そのもので、`"0.125"` を `13%` と見せると、画面が
 * 別の率を言っていることになります。
 *
 * @param rate - 掛ける率の decimal 文字列
 * @param locale - 用いる locale。省略時は {@link DEFAULT_LOCALE}
 * @returns 百分率の表記
 */
export function formatRate(rate: string, locale: string = DEFAULT_LOCALE): string {
  let formatter = rateFormatters.get(locale);

  if (formatter === undefined) {
    formatter = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 20 });
    rateFormatters.set(locale, formatter);
  }

  return formatter.format(toDecimalLiteral(rate));
}
