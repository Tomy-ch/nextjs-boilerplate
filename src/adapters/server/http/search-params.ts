/**
 * 受け取ったクエリ文字列を、条件として読める形へ写す。
 *
 * @remarks
 * 同じキーが繰り返されていたら並びのまま残します。**`searchParams` をそのまま
 * `Object.fromEntries` へ渡すと**最後の 1 つだけが残り、複数選べる条件が黙って 1 つに減ります。
 * キーを畳んでから組み立てるのはそのためです。
 *
 * 値をここで解釈はしません。何が正しい値かを決めているのは契約であり、その照合は取得口の側が
 * 行います。
 *
 * **キーは利用者が決めます。** 空の object へ `raw[key] =` で書くと `__proto__` が代入の
 * 対象になり、その object の prototype を差し替えられます。`Object.fromEntries` は同じ綴りでも
 * 自前のプロパティを作るため、キーの綴りが振る舞いを変えません。
 */
export function toRawQuery(
  searchParams: URLSearchParams,
): Readonly<Record<string, string | readonly string[]>> {
  const entries: [string, string | readonly string[]][] = [];

  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    const [single] = values;

    entries.push([key, values.length === 1 && single !== undefined ? single : values]);
  }

  return Object.fromEntries(entries);
}
