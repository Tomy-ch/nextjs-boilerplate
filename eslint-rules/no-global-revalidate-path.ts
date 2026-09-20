import type { Rule } from "eslint";

/**
 * アプリ全体を捨てる再検証を書かせないルール。
 *
 * 規約そのものは `docs/rules.md`「描画とキャッシュ」が持つ。
 *
 * **見るのはリテラルの組み合わせだけ。** `revalidatePath("/", "layout")` はどの route を捨てるかを
 * 引数で名乗っておらず、綴りだけで「全部」と決まる。**捨てる先が所有境界かどうかは人に残る** ——
 * 引数が変数なら、その値が何を指すかはここでは決まらない。
 */

/** アプリ全体を指す第 1 引数。 */
const ROOT_PATH = "/";

/** その配下すべてを巻き込む第 2 引数。 */
const LAYOUT_TYPE = "layout";

/** 呼び出しの名前。名前空間を経由した綴りも同じ関数を指す。 */
function calleeName(callee: Rule.Node): string | undefined {
  if (callee.type === "Identifier") {
    return callee.name;
  }

  if (callee.type === "MemberExpression" && callee.property.type === "Identifier") {
    return callee.property.name;
  }

  return undefined;
}

/** その引数が、指定の文字列リテラルか。 */
function isLiteral(node: Rule.Node | undefined, value: string): boolean {
  return node?.type === "Literal" && node.value === value;
}

const noGlobalRevalidatePath: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "再検証はデータの所有境界だけを捨てる",
    },
    schema: [],
    messages: {
      noGlobalRevalidatePath:
        '`revalidatePath("/", "layout")` はアプリ全体を捨てる呼び方であって、所有境界ではありません。捨てる先が複数の route にまたがるなら `revalidateTag` を使ってください。',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (calleeName(node.callee as Rule.Node) !== "revalidatePath") {
          return;
        }

        const [first, second] = node.arguments as (Rule.Node | undefined)[];

        if (isLiteral(first, ROOT_PATH) && isLiteral(second, LAYOUT_TYPE)) {
          context.report({ node, messageId: "noGlobalRevalidatePath" });
        }
      },
    };
  },
};

export default noGlobalRevalidatePath;
