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
