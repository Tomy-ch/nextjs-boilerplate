// `${{ }}` 式に現れる secrets コンテキストの参照の抽出。
//
// 受け取るのはワークフローのソースではなく、パース済みのスカラー 1 件の値。ソース全体を
// 直接走査すると、YAML コメントに書いた例示を実参照として拾い、閉じない `${{` があれば
// そこから次の `}}` までを 1 つの式と見なして間にある本物の参照を呑み込む。値の単位で見れば
// コメントは構造的に対象外になり、式の解釈も 1 つのスカラーの中に閉じる。
//
// GitHub の式コンテキストは大文字小文字を区別しないので、`${{ SECRETS.FOO }}` も
// `${{ secrets.foo }}` も同じ参照として拾う。

export type SecretReference = {
  // スカラーの値の先頭からのオフセット。行番号への変換は呼び出し側が持つ。
  offset: number;
  // `secrets.NAME` / `secrets['NAME']` の NAME。`toJSON(secrets)` のようにコンテキスト
  // 全体を参照している場合は null。
  name: string | null;
};

const OPEN = "${{";
const CLOSE = "}}";

const SECRET_REFERENCE =
  /(?<![\w.-])secrets(?![\w-])\s*(?:\.\s*([\w-]+)|\[\s*(['"])([\w-]+)\2\s*\])?/gi;

export function findSecretReferences(text: string): SecretReference[] {
  const found: SecretReference[] = [];

  for (let index = 0; ; ) {
    const open = text.indexOf(OPEN, index);
    if (open === -1) break;

    const bodyStart = open + OPEN.length;
    const close = expressionEnd(text, bodyStart);
    const bodyEnd = close === -1 ? text.length : close;
    index = close === -1 ? text.length : close + CLOSE.length;

    for (const match of maskStrings(text.slice(bodyStart, bodyEnd)).matchAll(SECRET_REFERENCE)) {
      found.push({ offset: bodyStart + (match.index ?? 0), name: match[1] ?? match[3] ?? null });
    }
  }

  return found;
}

// 式の終端は文字列リテラルの外にある `}}`。リテラルに `}}` を含む式で早期に打ち切ると、
// その先の参照を見落とす。
function expressionEnd(text: string, from: number): number {
  let inString = false;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (ch === "'") {
      inString = !inString;
      continue;
    }
    if (!inString && ch === "}" && text[i + 1] === "}") return i;
  }
  return -1;
}

// 式中のシングルクォート文字列は GitHub 上ではただのテキストで、`'secrets.FOO'` と書いても
// 参照にはならない。オフセットを保つため、同じ長さの空白へ潰してから参照を探す。
// GitHub の式で文字列を囲むのは単引用符だけで、その中の `''` は引用符 1 文字を表す
// （閉じた直後に開き直すと見なせば同じ結果になる）。
function maskStrings(body: string): string {
  let masked = "";
  let inString = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "'") {
      inString = !inString;
      masked += " ";
      continue;
    }
    masked += inString ? " " : ch;
  }
  return masked;
}
