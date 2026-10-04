/** 範囲のどちらの端か。 */
export type RangeEdge = "low" | "high";

/**
 * 範囲の片方の端を表示へ写す。空は、その端で区切らないことを表す。
 *
 * @param value - URL に載る値。空は指定なし
 * @param edge - 表示する端。指定なしの表示文言を選ぶために使う
 * @param formatValue - 値のある端の表示
 * @returns 表示用の文字列
 */
export function formatRangeEdge(
  value: string,
  edge: RangeEdge,
  formatValue: (value: string) => string,
): string {
  if (value === "") {
    return edge === "low" ? "下限なし" : "上限なし";
  }

  return formatValue(value);
}

/**
 * 下限と上限を 1 つの表示にまとめる。
 *
 * @param low - 下限。空は指定なし
 * @param high - 上限。空は指定なし
 * @param formatValue - 値のある端の表示
 * @returns 表示用の文字列。下限も上限も指定が無ければ `undefined`
 */
export function formatRangeLabel(
  low: string,
  high: string,
  formatValue: (value: string) => string,
): string | undefined {
  if (low === "" && high === "") {
    return undefined;
  }

  return `${formatRangeEdge(low, "low", formatValue)} 〜 ${formatRangeEdge(high, "high", formatValue)}`;
}
