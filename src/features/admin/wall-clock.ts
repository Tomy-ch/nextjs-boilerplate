/**
 * `datetime-local` の壁時計の値を、入力した人の時間帯で瞬間の文字列へ確定させる。
 *
 * @remarks
 * **ブラウザで呼びます。** 時差を持たない日時の綴りは、ECMAScript が実行環境の時間帯で読むと
 * 定めています。ブラウザで読めばそれが入力した人の時間帯になり、日時ごとにその時点の時差で
 * 解かれるため、夏時間をまたぐ期間でもずれません。サーバで読むと配備先の時間帯になるため、
 * 確定させた瞬間だけを送ります（[`docs/design/rendering.md`](../../../docs/design/rendering.md)）。
 *
 * @param wallClock - `datetime-local` の値
 * @returns ISO 8601 の瞬間。空なら空文字。読めなければ渡された値のままで、{@link instantOf} が読めないと判定する
 */
export function wallClockToInstant(wallClock: string): string {
  if (wallClock === "") {
    return "";
  }

  const instant = new Date(wallClock);

  return Number.isNaN(instant.getTime()) ? wallClock : instant.toISOString();
}

/**
 * 瞬間の文字列を日時として読む。
 *
 * @param text - {@link wallClockToInstant} で確定させた瞬間の文字列
 * @returns 読めた日時。空か読めなければ null
 */
export function instantOf(text: string): Date | null {
  if (text === "") {
    return null;
  }

  const instant = new Date(text);

  return Number.isNaN(instant.getTime()) ? null : instant;
}
