import type { Nodes, Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { sanitize } from "hast-util-sanitize";

import { DOCUMENT_SANITIZE_SCHEMA } from "./document.definition";

/**
 * hast のノードを root ノードへ揃えます。
 *
 * sanitize の戻り値はノード種別の union であり、root 以外を返しうる型を持ちます。描画側が常に
 * root を受け取れるよう、root 以外は root の子として包みます。
 */
export function toDocumentRoot(node: Nodes): Root {
  return node.type === "root" ? node : { type: "root", children: [node] };
}

/**
 * sanitize 済みのドキュメント本文を表す Value Object です。
 *
 * 構築経路を {@link SanitizedDocument.from} だけに絞ることで、sanitize を通っていない HTML が
 * この型として流通しえない状態を型で保証します。
 */
export class SanitizedDocument {
  /** {@link DOCUMENT_SANITIZE_SCHEMA} が通したタグと属性だけを含む hast root です。 */
  readonly root: Root;

  private constructor(root: Root) {
    this.root = root;
  }

  /**
   * HTML 文字列を parse して sanitize し、Value Object を構築します。
   *
   * parse は fragment として行うため、`html` / `head` / `body` は補われません。仕様準拠の parser で
   * 木にしてから木を検査するため、文字列置換による sanitize で起こる parser の解釈差を持ちません。
   */
  static from(html: string): SanitizedDocument {
    return new SanitizedDocument(
      toDocumentRoot(sanitize(fromHtml(html, { fragment: true }), DOCUMENT_SANITIZE_SCHEMA)),
    );
  }
}
