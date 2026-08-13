import type { Schema } from "hast-util-sanitize";

/**
 * ブロックとして通すタグです。
 *
 * `h1` は含めません。本文の見出しが page の `h1` と競合するためです。
 */
const RICH_TEXT_BLOCK_TAG_NAMES: readonly string[] = [
  "p",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
];

/** インラインとして通すタグです。 */
const RICH_TEXT_INLINE_TAG_NAMES: readonly string[] = ["strong", "em", "s", "code", "a", "br"];

/**
 * sanitize 後に残るタグの全体です。
 *
 * リッチテキストを出力する editor は、この集合に収まる範囲でのみ拡張できます。
 */
export const RICH_TEXT_TAG_NAMES: readonly string[] = [
  ...RICH_TEXT_BLOCK_TAG_NAMES,
  ...RICH_TEXT_INLINE_TAG_NAMES,
];

/** `a` の `href` に通すプロトコルです。 */
export const RICH_TEXT_LINK_PROTOCOLS: readonly string[] = ["http", "https", "mailto"];

/**
 * 内容ごと取り除くタグです。
 *
 * allowlist 外のタグは既定では中身を残して展開されるため、テキスト子要素がそのまま本文へ混ざる
 * タグだけをここへ列挙します。
 */
const RICH_TEXT_STRIPPED_TAG_NAMES: readonly string[] = ["script", "style"];

/**
 * allowlist から導出した sanitize schema です。
 *
 * {@link SanitizedRichText.from} が使う唯一の schema であり、`hast-util-sanitize` の既定 schema へ
 * 委ねる項目を残しません。未指定の項目は既定値で補完される仕様のため、上流の既定が広がったときに
 * 通過範囲が黙って広がることを防ぎます。
 *
 * @see {@link RICH_TEXT_TAG_NAMES}
 */
export const RICH_TEXT_SANITIZE_SCHEMA: Readonly<Schema> = {
  allowComments: false,
  allowDoctypes: false,
  ancestors: { li: ["ul", "ol"] },
  attributes: { a: ["href"] },
  clobber: [],
  clobberPrefix: "",
  protocols: { href: [...RICH_TEXT_LINK_PROTOCOLS] },
  required: {},
  strip: [...RICH_TEXT_STRIPPED_TAG_NAMES],
  tagNames: [...RICH_TEXT_TAG_NAMES],
};
