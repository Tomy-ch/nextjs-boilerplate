/** 金額として最低限見せる小数桁。 */
const MIN_FRACTION_DIGITS = 2;

/** 合算できる 1 行。金額と数量だけを見る。 */
type Priced = {
  readonly price: string;
  readonly quantity: number;
};

function fractionDigitsOf(price: string): number {
  return (price.split(".")[1] ?? "").length;
}

function toScaled(price: string, scale: number): bigint {
  const [integer, fraction = ""] = price.split(".");

  return BigInt(`${integer}${fraction.padEnd(scale, "0")}`);
}

/**
 * 明細の小計を decimal 文字列で返す。
 *
 * @remarks
 * 合算は整数として行います。`Number` へ通すと IEEE754 の丸めが入り、桁数の多い価格や件数の多い
 * カートで 1 セント単位の狂いが出ます。
 *
 * 小数桁は入力に現れた最大の桁数に揃えます。サブセントの価格を丸めてから足すと、丸め誤差が件数
 * ぶん積み上がるためです。
 *
 * @param lines - 合算する明細
 */
export function cartSubtotal(lines: readonly Priced[]): string {
  const scale = Math.max(MIN_FRACTION_DIGITS, ...lines.map((line) => fractionDigitsOf(line.price)));
  const total = lines.reduce(
    (sum, line) => sum + toScaled(line.price, scale) * BigInt(line.quantity),
    BigInt(0),
  );
  const digits = total.toString().padStart(scale + 1, "0");

  return `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}
