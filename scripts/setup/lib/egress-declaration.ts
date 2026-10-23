// `.github/egress.yaml` から、参照が消えた workflow の宣言（宛先・監査のまま・sudo の例外）を
// 落とす判定。
//
// セットアップが workflow を消す 2 つの道具が使う。どちらも「workflow を 1 本消すと、その workflow
// のためだけに置いた宣言が孤児になる」という同じ形を持ち、`make egress-check` は
// 「どの workflow・job も対応しないキー」で落ちる。

/** workflow のキーが立つ字下げ。`workflows:` / `audit:` / `sudo:` の直下。 */
const WORKFLOW_INDENT = 2;

/**
 * 孤児になる宣言の塊を落とす。
 *
 * @param text - `.github/egress.yaml` の中身。
 * @param names - 落とす workflow の名前。
 * @returns 書き戻す中身。落とす塊が無ければ元のまま。
 *
 * @remarks
 * 落とすのは**字下げ 2 のキー**だけです。それより深い同名のキー（`sudo:` の下の job 名）は、
 * 残る workflow に属するので触りません。1 つのキーが持つのは「キーの行」と、それに続く
 * **より深く字下げされた行**です。空行は塊の切れ目として扱いません —— 続きの前に空行を置いた
 * 宣言でも、同じ塊として落とす必要があります。末尾の改行は残します。
 */
export function dropOrphanedDeclarations(text: string, names: readonly string[]): string {
  const trailing = text.endsWith("\n");
  const lines = (trailing ? text.slice(0, -1) : text).split("\n");
  const kept: string[] = [];
  let dropping = false;

  for (const line of lines) {
    const indent = line.length - line.trimStart().length;

    if (dropping) {
      if (line.trim() === "" || indent > WORKFLOW_INDENT) continue;
      dropping = false;
    }

    const name = /^([A-Za-z0-9_-]+):/.exec(line.trimStart())?.[1];

    if (indent === WORKFLOW_INDENT && name !== undefined && names.includes(name)) {
      dropping = true;
      continue;
    }

    kept.push(line);
  }

  if (kept.length === lines.length) return text;

  return trailing ? `${kept.join("\n")}\n` : kept.join("\n");
}
