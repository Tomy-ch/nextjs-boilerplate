/**
 * toolbar で選んだ値から、属性へ書く値を決める。
 *
 * @remarks
 * 既定を選んだときは属性を書かず外します。既定の配色（OS の設定に従う）も既定の系統も、属性が
 * 無い状態として CSS に出ているので、既定値を綴りで書くとどちらにも当たりません。
 *
 * @param selected - toolbar で選んだ値
 * @param fallback - 属性を持たない状態が表す値
 * @returns 属性へ書く値。外すなら `undefined`
 */
export function attributeValue(selected: unknown, fallback: string): string | undefined {
  const value = String(selected);

  return value === fallback ? undefined : value;
}

/**
 * 属性へ値を書く。値が無ければ属性を外す。
 *
 * @param element - 属性を持たせる要素
 * @param name - 属性の名前
 * @param value - 書く値。外すなら `undefined`
 */
export function writeAttribute(element: Element, name: string, value: string | undefined): void {
  if (value === undefined) element.removeAttribute(name);
  else element.setAttribute(name, value);
}
