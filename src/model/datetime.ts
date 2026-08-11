import { DEFAULT_LOCALE, DEFAULT_TIME_ZONE } from "./locale";

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterOf(locale: string): Intl.DateTimeFormat {
  let formatter = formatters.get(locale);

  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: DEFAULT_TIME_ZONE,
    });
    formatters.set(locale, formatter);
  }

  return formatter;
}

/**
 * 日時を locale に沿った文字列にする。
 *
 * @remarks
 * `Intl.DateTimeFormat` の生成は locale ごとに 1 度だけ行い、以降は使い回します。生成には
 * locale データの解決が伴うため、描画ごとに作ると件数に比例して積み上がります。
 *
 * タイムゾーンは {@link DEFAULT_TIME_ZONE} に固定します。ランタイムに任せると、サーバで描画した
 * 文字列とブラウザで描画した文字列が実行場所ぶんずれます。
 *
 * @param value - 表示する日時
 * @param locale - 用いる locale。省略時は {@link DEFAULT_LOCALE}
 */
export function formatDateTime(value: Date, locale: string = DEFAULT_LOCALE): string {
  return formatterOf(locale).format(value);
}
