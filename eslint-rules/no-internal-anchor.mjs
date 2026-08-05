/**
 * 内部リンクに生の `<a href="/...">` を使わせないルール。
 *
 * `next/link` を通さない内部遷移はクライアント遷移とプリフェッチを失い、フルリロードになる。
 * Biome には同等の検査が無いため ESLint 側で持つ。
 *
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description: "内部リンクには next/link を使う",
    },
    schema: [],
    messages: {
      noInternalAnchor: "内部リンクには <a> ではなく next/link を使ってください。",
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== "JSXIdentifier" || node.name.name !== "a") {
          return;
        }

        const href = node.attributes.find(
          (attribute) => attribute.type === "JSXAttribute" && attribute.name.name === "href",
        );

        if (
          href?.type !== "JSXAttribute" ||
          href.value?.type !== "Literal" ||
          typeof href.value.value !== "string" ||
          !href.value.value.startsWith("/")
        ) {
          return;
        }

        context.report({ node, messageId: "noInternalAnchor" });
      },
    };
  },
};
