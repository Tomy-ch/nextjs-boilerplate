/**
 * Markdown の見出しから、GitHub と同じアンカーを組む。
 *
 * @remarks
 * ここが追いかけているのは**外部仕様**です。GitHub の slug 規則が変われば直すのはここだけで、
 * リンクをどう拾うか（[doc-links](doc-links.ts)）とは別の理由で動きます。
 */

/** コードフェンスの開閉。 */
const FENCE = /^\s*(```|~~~)/;

/** ATX 見出し。 */
const HEADING = /^#{1,6}[ \t]+(.*)/;

/** 見出しの末尾に付く閉じハッシュ。見出しの一部ではない。手前の空白は `trimEnd` が落とす。 */
const CLOSING_HASHES = /[ \t]#+$/;

/**
 * 文書が自分で綴りを決めた錨。
 *
 * @remarks
 * GitHub は `id` を `user-content-` 付きで描き、断片の解決も同じ規則で行うため、指す側は接頭辞を
 * 書きません。ここもそれに合わせて綴りをそのまま採ります。
 *
 * 見出しの slug ではなく明示の錨を正とする判断は、[scripts](../README.md)「関連する ADR」が持ちます。
 */
const EXPLICIT_ANCHOR = /<a\s[^<>]*\bid="([^"]+)"/gi;

/**
 * 見出しを GitHub と同じ規則でアンカーへ変換する。
 *
 * @remarks
 * 小文字化し、英数字・空白・ハイフン・アンダースコア以外を落とし、空白をハイフンにします。
 * 日本語の見出しはそのまま残るため、`#storybook-の表示規約` のような形になります。
 *
 * インラインの装飾（コードスパン・強調・リンク）は、GitHub が描画してから slug 化するのに
 * 合わせて先に外します。
 */
export function toAnchor(heading: string): string {
  return withoutTags(heading.trim())
    .replace(/\[([^\]]*)\]\([^()]*\)/g, "$1")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M} _-]/gu, "")
    .replace(/ /g, "-");
}

/**
 * Markdown が持つアンカーを集める。
 *
 * @remarks
 * 同じ見出しが 2 度目以降に現れたときは `-1` / `-2` が付きます。GitHub の採番に合わせています。
 *
 * コードフェンスの中の `#` は見出しではありません。外さないと、例示した見出しがアンカーとして
 * 数えられ、実在しない節への参照が通ります。明示の錨も同じ理由でフェンスの外だけを見ます。
 */
export function collectAnchors(markdown: string): Set<string> {
  const anchors = new Set<string>();
  const seen = new Map<string, number>();
  let inFence = false;

  // BOM は 1 行目の見出しの手前に付く。剥がさないと `^#` に当たらず、実在する節への参照が
  // 「見出しが無い」として報告される。
  for (const line of markdown.replace(/^\uFEFF/, "").split("\n")) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) continue;

    for (const [, id] of line.matchAll(EXPLICIT_ANCHOR)) anchors.add(id.toLowerCase());

    const heading = HEADING.exec(line)?.[1];

    if (heading === undefined) continue;

    const base = toAnchor(heading.trimEnd().replace(CLOSING_HASHES, ""));
    const count = seen.get(base) ?? 0;

    seen.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }

  return anchors;
}

/**
 * 指し先の Markdown がそのアンカーを持つか。
 *
 * @remarks
 * `#` の後ろは URL エンコードされていることがあります。**解けない文字列は解こうとせず、その
 * ままの綴りで見ます。** 解けないことを例外で伝えると、リンク 1 本の書き損じで走査そのものが
 * 止まり、同じ実行の他の指摘が一つも出なくなります。
 */
export function hasAnchor(markdown: string, fragment: string): boolean {
  return collectAnchors(markdown).has(decodeFragment(fragment).toLowerCase());
}

function decodeFragment(fragment: string): string {
  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}

/**
 * タグの記法を落とす。
 *
 * @remarks
 * 1 度で終えません。`<<em>>` のように入れ子・壊れた形で書かれると、1 度剥がした跡がもう一度
 * タグの形になります。残ると `em` のような綴りがアンカーへ紛れ込み、GitHub の付ける値と
 * 食い違います。
 */
function withoutTags(heading: string): string {
  let current = heading;
  let previous = "";

  while (current !== previous) {
    previous = current;
    current = current.replace(/<[^<>]*>/g, "");
  }

  return current;
}
