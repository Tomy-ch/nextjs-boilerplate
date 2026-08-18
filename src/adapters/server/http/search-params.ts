/**
 * 受け取ったクエリ文字列を、条件として読める形へ写す。
 *
 * @remarks
 * 同じキーが繰り返されていたら並びのまま残します。`Object.fromEntries` で畳むと最後の 1 つ
 * だけが残り、複数選べる条件が黙って 1 つに減ります。
 *
 * 値をここで解釈はしません。何が正しい値かを決めているのは契約であり、その照合は取得口の側が
 * 行います。
 */
export function toRawQuery(
  searchParams: URLSearchParams,
): Readonly<Record<string, string | readonly string[]>> {
  const raw: Record<string, string | readonly string[]> = {};

  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    const [single] = values;

    raw[key] = values.length === 1 && single !== undefined ? single : values;
  }

  return raw;
}
