import type { Element, Nodes } from "hast";

/** mermaid のコードフェンスが `code` に持つ class です。 */
const MERMAID_CLASS_NAME = "language-mermaid";

/** ノードの文字列を連結して取り出します。 */
function textOf(node: Nodes): string {
  if (node.type === "text") {
    return node.value;
  }

  return "children" in node ? node.children.map(textOf).join("") : "";
}

/** `className` プロパティを配列として読みます。hast は文字列でも配列でも持ちます。 */
function classNamesOf(node: Element): string[] {
  // hast の型は配列しか名乗らないが、parser は文字列のまま持つこともある。値の形で受ける。
  const className: unknown = node.properties.className;

  if (Array.isArray(className)) {
    return className.map(String);
  }

  return typeof className === "string" ? className.split(/\s+/) : [];
}

/**
 * `pre` が包んでいる mermaid 図の原文を取り出します。
 *
 * @remarks
 * 図として描くかどうかは、木の形だけで決めます。描画側が文字列を再度 parse すると、sanitize を
 * 通った木と描画の判断が別の根拠を持つことになります。
 *
 * @param node - `pre` 要素。
 * @returns mermaid のフェンスなら原文。そうでなければ `undefined`。
 */
export function mermaidSourceOf(node: Element): string | undefined {
  if (node.tagName !== "pre" || node.children.length !== 1) {
    return undefined;
  }

  const [child] = node.children;

  if (child?.type !== "element" || child.tagName !== "code") {
    return undefined;
  }

  return classNamesOf(child).includes(MERMAID_CLASS_NAME) ? textOf(child) : undefined;
}
