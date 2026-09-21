import type { Rule } from "eslint";

/**
 * アプリ全体を捨てる再検証を、例外と分かる綴りでだけ書かせるルール。
 *
 * 規約そのものは `docs/rules.md`「描画とキャッシュ」が持ち、決定は
 * [0071](../docs/adr/0071-bff-api-integration.md) が持つ。
 *
 * 見るのは 1 つ。**`revalidatePath("/", "layout")` というリテラルの形**だけである。
 * これはアプリ全体を捨てる呼び方であって所有境界ではない。**所有境界そのものの判定は見ない**
 * —— 捨てる先がそのミューテーションの変えたデータを描いている route かは、コードの形から決まらない。
 *
 * 経路が変数で渡された形は、綴りがここでは決まらないので見ない。
 *
 * 外枠に出る値のための例外は、`eslint-disable-next-line` でその場に理由を書いて名乗る。
 * 専用の綴りを作らないのは、`docs/rules.md`「コメントと文書」が、印が要るならエコシステム標準の
 * 綴りへ揃えて独自の接頭辞を作らないと定めているためである。
 */

/** アプリ全体を捨てる呼び方。第 1 引数が根で、第 2 引数が `layout` のとき。 */
const APP_ROOT_PATH = "/";
const LAYOUT_TYPE = "layout";

/** 引数の綴り。静的に決まらない形は `undefined`。 */
function argumentSpelling(node: Rule.Node): string | undefined {
  if (node.type === "Literal") {
    return typeof node.value === "string" ? node.value : undefined;
  }

  if (node.type === "TemplateLiteral") {
    return node.quasis.map((quasi) => quasi.value.raw).join("");
  }

  return undefined;
}

const noAppWideRevalidate: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "アプリ全体を捨てる再検証は、外枠に出る値のための例外としてだけ書く",
    },
    schema: [],
    messages: {
      appWide:
        '`revalidatePath("/", "layout")` はアプリ全体を捨てる呼び方で、所有境界ではありません。捨てる先が複数の route にまたがるなら `revalidateTag` を使います。更新した値がどの画面にも付く外枠に出るときだけの例外で、その場合は `eslint-disable-next-line` に理由を書いて名乗ります。',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || node.callee.name !== "revalidatePath") {
          return;
        }

        if (node.arguments.length !== 2) {
          return;
        }

        const [path, type] = node.arguments;

        if (
          argumentSpelling(path as Rule.Node) === APP_ROOT_PATH &&
          argumentSpelling(type as Rule.Node) === LAYOUT_TYPE
        ) {
          context.report({ node, messageId: "appWide" });
        }
      },
    };
  },
};

export default noAppWideRevalidate;
