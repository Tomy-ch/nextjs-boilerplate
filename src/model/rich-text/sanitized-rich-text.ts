import type { Nodes, Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { sanitize } from "hast-util-sanitize";

import { RICH_TEXT_SANITIZE_SCHEMA } from "./rich-text.definition";

/**
 * hast のノードを root ノードへ揃えます。
 *
 * sanitize の戻り値はノード種別の union であり、root 以外を返しうる型を持ちます。描画側が常に
 * root を受け取れるよう、root 以外は root の子として包みます。
 *
 * @param node - 揃える対象のノード
 * @returns 与えたノードを内容とする root ノード
 */
export function toRichTextRoot(node: Nodes): Root {
  return node.type === "root" ? node : { type: "root", children: [node] };
}

/**
 * sanitize 済みのリッチテキストを表す Value Object です。
 *
 * 構築経路を {@link SanitizedRichText.from} だけに絞ることで、sanitize を通っていない HTML が
 * この型として流通しえない状態を型で保証します。描画側はこの型だけを受け取り、HTML 文字列を
 * 受け取りません。
 *
 * @remarks
 * class instance は serializable ではないため、Client Component の props へ直接渡せません。
 * 渡す必要が生じた場合は {@link SanitizedRichText.root} を取り出すことになりますが、その時点で
 * 「sanitize 済みである」ことの型保証は失われます。
 *
 * @example
 * ```ts
 * import { SanitizedRichText } from "@/model/rich-text/sanitized-rich-text";
 *
 * const content = SanitizedRichText.from("<p>本文<script>alert(1)</script></p>");
 * ```
 */
export class SanitizedRichText {
  /**
   * sanitize 済みの hast root ノードです。
   *
   * {@link RICH_TEXT_SANITIZE_SCHEMA} が通したタグと属性だけを含みます。
   */
  readonly root: Root;

  private constructor(root: Root) {
    this.root = root;
  }

  /**
   * HTML 文字列を parse して sanitize し、Value Object を構築します。
   *
   * parse は fragment として行うため、`html` / `head` / `body` は補われません。仕様準拠の parser で
   * 木にしてから木を検査するため、文字列置換による sanitize で起こる parser の解釈差を持ちません。
   * 不正な入れ子は parse の段階で正規化され、例外にはなりません。
   *
   * @param html - 未検査の HTML 文字列
   * @returns allowlist の範囲だけを残した {@link SanitizedRichText}
   */
  static from(html: string): SanitizedRichText {
    const parsed = fromHtml(html, { fragment: true });

    return new SanitizedRichText(toRichTextRoot(sanitize(parsed, RICH_TEXT_SANITIZE_SCHEMA)));
  }
}
