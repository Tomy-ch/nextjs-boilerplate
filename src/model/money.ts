import { DEFAULT_LOCALE } from "./locale";

/** 保存と表示の基準にする通貨。 */
export const BASE_CURRENCY = "USD";

/**
 * 表示通貨での参考換算額。
 *
 * @remarks
 * 請求額ではありません。保存も計算も {@link BASE_CURRENCY} で行い、この値は読み手が金額の
 * 大きさを掴むためだけに添えます。レートと基準日を併せて持つのは、いつの相場による目安かが
 * 判らなければ参考にならないためです。
 */
export type ReferenceAmount = {
  readonly currency: string;
  /** 最小単位（`JPY` なら円）の整数で表した換算後の金額。 */
  readonly amount: number;
  /** 換算に用いたレート。基準通貨 1 単位あたりの表示通貨換算値。 */
  readonly rate: string;
  /** レートの基準日。 */
  readonly rateDate: string;
};

const formatters = new Map<string, Intl.NumberFormat>();

/**
 * locale と通貨の組ごとの整形器。
 *
 * @remarks
 * 生成には locale データの解決が伴うため、描画ごとに作ると件数に比例して積み上がります。
 */
function formatterOf(locale: string, currency: string): Intl.NumberFormat {
  const key = `${locale}/${currency}`;
  let formatter = formatters.get(key);

  if (formatter === undefined) {
    formatter = new Intl.NumberFormat(locale, { style: "currency", currency });
    formatters.set(key, formatter);
  }

  return formatter;
}

/**
 * 最小単位の整数を、その通貨の表記にする。
 *
 * @remarks
 * 1 単位あたりの最小単位の数は通貨ごとに違う（`USD` は 100、`JPY` は 1）ため、`Intl` が
 * その通貨に用いる小数桁から導きます。通貨と桁数の対応を手元の表に持つと、扱う通貨が
 * 増えるたびに 2 か所を揃えることになります。
 */
function formatMinorUnits(minorUnits: number, currency: string, locale: string): string {
  const formatter = formatterOf(locale, currency);
  /* istanbul ignore next -- 通貨を指定した整形器は小数桁を必ず解決する。TS の絞り込みのためだけの分岐。 */
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 0;

  return formatter.format(minorUnits / 10 ** digits);
}

/**
 * 最小単位の整数で受け取った基準通貨の金額を、locale に沿った通貨表記にする。
 *
 * @remarks
 * 契約が金額を最小単位の整数で返すのは、小数で持つと桁の丸めが往復のたびに効くためです。
 * 主単位へ戻すのは表示の直前だけで、計算は整数のまま行います。
 *
 * @param minorUnits - 最小単位（セント）の整数で表した金額
 * @param locale - 用いる locale。省略時は {@link DEFAULT_LOCALE}
 */
export function formatMoney(minorUnits: number, locale: string = DEFAULT_LOCALE): string {
  return formatMinorUnits(minorUnits, BASE_CURRENCY, locale);
}

/**
 * 参考換算額を、その通貨の表記にする。
 *
 * @remarks
 * 参考であることはこの関数では示しません。書式に「約」や注記を混ぜると、金額として読める形が
 * 2 通りに割れます。参考であることは、置き方と添える文言で画面が示します。
 *
 * @param reference - 契約が返した参考換算額
 * @param locale - 用いる locale。省略時は {@link DEFAULT_LOCALE}
 */
export function formatReferenceAmount(
  reference: ReferenceAmount,
  locale: string = DEFAULT_LOCALE,
): string {
  return formatMinorUnits(reference.amount, reference.currency, locale);
}
