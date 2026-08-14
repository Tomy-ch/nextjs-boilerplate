import { DEFAULT_LOCALE } from "./locale";

/** 保存と表示の基準にする通貨。 */
const BASE_CURRENCY = "USD";

/** 1 通貨単位あたりの最小単位の数。`USD` のセントを主単位へ戻すのに使う。 */
const MINOR_UNITS_PER_UNIT = 100;

const formatters = new Map<string, Intl.NumberFormat>();

function formatterOf(locale: string): Intl.NumberFormat {
  let formatter = formatters.get(locale);

  if (formatter === undefined) {
    formatter = new Intl.NumberFormat(locale, { style: "currency", currency: BASE_CURRENCY });
    formatters.set(locale, formatter);
  }

  return formatter;
}

/**
 * 最小単位の整数で受け取った金額を、locale に沿った通貨表記にする。
 *
 * @remarks
 * 契約が金額を最小単位の整数で返すのは、小数で持つと桁の丸めが往復のたびに効くためです。
 * 主単位へ戻すのは表示の直前だけで、計算は整数のまま行います。
 *
 * `Intl.NumberFormat` の生成は locale ごとに 1 度だけ行い、以降は使い回します。生成には
 * locale データの解決が伴うため、描画ごとに作ると件数に比例して積み上がります。
 *
 * @param minorUnits - 最小単位（`USD` ならセント）の整数で表した金額
 * @param locale - 用いる locale。省略時は {@link DEFAULT_LOCALE}
 */
export function formatMoney(minorUnits: number, locale: string = DEFAULT_LOCALE): string {
  return formatterOf(locale).format(minorUnits / MINOR_UNITS_PER_UNIT);
}
