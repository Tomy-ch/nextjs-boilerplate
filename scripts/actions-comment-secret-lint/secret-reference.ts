// `${{ }}` 式に現れる secrets コンテキストの参照の抽出。
//
// 式の内側だけを見るのは、散文や YAML コメント中の「secrets」に反応させないため。
// GitHub の式コンテキストは大文字小文字を区別しないので、`${{ SECRETS.FOO }}` も
// `${{ secrets.foo }}` も同じ参照として拾う。

export type SecretReference = {
  // ソース先頭からのオフセット。行番号への変換は呼び出し側が持つ。
  offset: number;
  // `secrets.NAME` / `secrets['NAME']` の NAME。`toJSON(secrets)` のようにコンテキスト
  // 全体を参照している場合は null。
  name: string | null;
};

const OPEN = "${{";
const CLOSE = "}}";

const SECRET_REFERENCE =
  /(?<![\w.-])secrets(?![\w-])\s*(?:\.\s*([\w-]+)|\[\s*(['"])([\w-]+)\2\s*\])?/gi;

export function findSecretReferences(
  source: string,
  isExcluded: (offset: number) => boolean,
): SecretReference[] {
  const found: SecretReference[] = [];

  for (let index = 0; ; ) {
    const open = source.indexOf(OPEN, index);
    if (open === -1) break;

    const bodyStart = open + OPEN.length;
    const close = expressionEnd(source, bodyStart);
    const bodyEnd = close === -1 ? source.length : close;
    index = close === -1 ? source.length : close + CLOSE.length;

    if (isExcluded(open)) continue;
    for (const match of source.slice(bodyStart, bodyEnd).matchAll(SECRET_REFERENCE)) {
      found.push({ offset: bodyStart + (match.index ?? 0), name: match[1] ?? match[3] ?? null });
    }
  }

  return found;
}

// 式の終端は文字列リテラルの外にある `}}`。リテラルに `}}` を含む式で早期に打ち切ると、
// その先の参照を見落とす。GitHub の式で文字列を囲むのは単引用符だけで、その中の `''` は
// 引用符 1 文字を表す（閉じた直後に開き直すと見なせば同じ結果になる）。
function expressionEnd(source: string, from: number): number {
  let inString = false;
  for (let i = from; i < source.length; i++) {
    const ch = source[i];
    if (ch === "'") {
      inString = !inString;
      continue;
    }
    if (!inString && ch === "}" && source[i + 1] === "}") return i;
  }
  return -1;
}
