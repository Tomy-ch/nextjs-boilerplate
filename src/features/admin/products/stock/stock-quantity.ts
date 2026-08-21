/**
 * 入力された量を、動かせる数として読む。
 *
 * @remarks
 * **送信を読む側と、見込みを出す側が同じ規則を使うための 1 つの口です。**片方だけに規則を書くと、
 * 画面には見込みが出ているのに送ると弾かれる（またはその逆）状態が作れます。
 *
 * 0 と負の数を退けます。符号は向きが持つため負が届く筋が無く、0 は何も動かさない要求です
 * （成功として一覧へ戻る一方、押した人は動いたと受け取ります）。
 *
 * @param value - 入力欄の値。打ちかけの空文字を含む
 * @returns 動かせる数。読めなければ null
 */
export function toStockQuantity(value: string): number | null {
  if (value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
}
