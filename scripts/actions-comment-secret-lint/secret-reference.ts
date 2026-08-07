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

// コンテキストの参照そのもの。名前の取り出しは別に行うため、ここは `secrets` の語だけを見る。
const SECRET_CONTEXT = /(?<![\w.-])secrets(?![\w-])/gi;

// 参照の直後に続く添字。`secrets.NAME` と `secrets['NAME']` / `secrets["NAME"]` を受ける。
const SECRET_NAME = /^secrets\s*(?:\.\s*([\w-]+)|\[\s*(['"])([\w-]+)\2\s*\])/i;

export function findSecretReferences(text: string): SecretReference[] {
  const found: SecretReference[] = [];

  for (let index = 0; ; ) {
    const open = text.indexOf(OPEN, index);
    if (open === -1) break;

    const bodyStart = open + OPEN.length;
    const close = expressionEnd(text, bodyStart);
    const bodyEnd = close === -1 ? text.length : close;
    index = close === -1 ? text.length : close + CLOSE.length;

    const body = text.slice(bodyStart, bodyEnd);

    // 参照かどうかは文字列リテラルを潰した側で決め、名前は潰す前の値から取る。GitHub の式で
    // 文字列を囲むのは単引用符だけなので、潰した側から名前まで読もうとすると
    // `secrets['NAME']` の NAME が消え、実参照の名前が常に伏せられる。
    for (const match of maskStrings(body).matchAll(SECRET_CONTEXT)) {
      const offset = match.index ?? 0;
      const named = SECRET_NAME.exec(body.slice(offset));

      found.push({ offset: bodyStart + offset, name: named?.[1] ?? named?.[3] ?? null });
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
