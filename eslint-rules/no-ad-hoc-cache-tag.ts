import { join, resolve, sep } from "node:path";

import type { Rule } from "eslint";

/**
 * 捨てる印を、決めた形と決めた場所でだけ付けさせるルール。
 *
 * 規約そのものは `docs/rules.md`「描画とキャッシュ」が持つ。
 *
 * 見るのは 2 つ。**印の段の数**（`<資源>` と `<資源>:<識別子>` の 2 段まで）と、**印を付ける場所**
 * （取得側の 1 か所）である。**資源名がバックエンド契約の集合名と揃っているかは見ない** —— 契約を
 * 読まないと決まらない。
 *
 * 印が変数で渡された形は、綴りがここでは決まらないので段の数を見ない。場所のほうは綴りに依らないので、
 * その場合も見る。
 */

/** 印を付けてよい場所。 */
const TAGGING_KERNEL = join("src", "adapters");

/** 印が持ってよい区切りの数。`<資源>:<識別子>` の 1 つまで。 */
const MAXIMUM_SEPARATORS = 1;

/** 印の綴り。静的に決まらない形は `undefined`。 */
function tagSpelling(node: Rule.Node): string | undefined {
  if (node.type === "Literal") {
    return typeof node.value === "string" ? node.value : undefined;
  }

  if (node.type === "TemplateLiteral") {
    return node.quasis.map((quasi) => quasi.value.raw).join("");
  }

  return undefined;
}

const noAdHocCacheTag: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "捨てる印は 2 段までで、取得側の 1 か所で付ける",
    },
    schema: [],
    messages: {
      tooManySegments:
        "印は `<資源>` と `<資源>:<識別子>` の 2 段だけを使います（`{{ tag }}`）。段を増やすと、捨てる側が同じ綴りを組み直せません。",
      outsideAdapters:
        "印を付けるのは取得側（`src/adapters/`）の 1 か所です。取得と再検証で綴りを別々に決めると、捨てたつもりのものが残ります。",
    },
  },
  create(context) {
    const kernel = resolve(context.cwd, TAGGING_KERNEL) + sep;
    const inTaggingKernel = resolve(context.filename).startsWith(kernel);

    return {
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || node.callee.name !== "cacheTag") {
          return;
        }

        if (!inTaggingKernel) {
          context.report({ node, messageId: "outsideAdapters" });
        }

        for (const argument of node.arguments) {
          const tag = tagSpelling(argument as Rule.Node);

          if (tag !== undefined && tag.split(":").length > MAXIMUM_SEPARATORS + 1) {
            context.report({
              node: argument as Rule.Node,
              messageId: "tooManySegments",
              data: { tag },
            });
          }
        }
      },
    };
  },
};

export default noAdHocCacheTag;
