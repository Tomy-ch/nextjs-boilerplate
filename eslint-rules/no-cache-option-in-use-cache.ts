import type { Rule } from "eslint";

import { isServerCacheDirective } from "./cache-directive";

/**
 * `use cache` の内側の取得に、個別のキャッシュ指定を置かせないルール。
 *
 * 規約そのものは `docs/rules.md`「描画とキャッシュ」が持つ。
 *
 * **判定の単位はモジュールである。** 宣言が関数に付いていても、同じモジュールの取得は外側の寿命に
 * 従わせる設計なので、モジュール全体を対象にする（`no-user-scoped-in-cached-module` と同じ単位）。
 *
 * 見るのは `fetch` の第 2 引数に**その場で書いた**オブジェクトだけ。変数で渡した設定はここでは
 * 中身が決まらない。
 */

/** 外側の寿命と競合する指定。 */
const CONFLICTING_OPTIONS: readonly string[] = ["cache", "next"];

/**
 * そのプロパティが、外側の寿命と競合する指定か。
 *
 * 鍵は綴りのまま突き合わせる。種別で分岐すると、素の名前と引用符つきの名前で同じ判定を 2 度
 * 書くことになる。添字で組んだ鍵は、名前がここでは決まらないので見ない。
 */
function conflictingOption(
  property: Rule.Node,
  spell: (node: Rule.Node) => string,
): string | undefined {
  if (property.type !== "Property" || property.computed) {
    return undefined;
  }

  const key = spell(property.key as Rule.Node);

  return CONFLICTING_OPTIONS.find(
    (option) => key === option || key === `"${option}"` || key === `'${option}'`,
  );
}

const noCacheOptionInUseCache: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "`use cache` の内側の取得に個別のキャッシュ指定を置かない",
    },
    schema: [],
    messages: {
      noCacheOptionInUseCache:
        "`use cache` の内側の取得に `{{ option }}` を渡さないでください。内側の取得はまとめて外側の寿命に従うため、二重に持つと内側が切れないぶん、外側が再取得しても同じ古い応答を掴みます。寿命は `cacheLife`、印は `cacheTag` が持ちます。",
    },
  },
  create(context) {
    const options: { node: Rule.Node; option: string }[] = [];
    let cached = false;

    return {
      Literal(node) {
        if (
          node.parent.type === "ExpressionStatement" &&
          typeof node.value === "string" &&
          isServerCacheDirective(node.value)
        ) {
          cached = true;
        }
      },
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || node.callee.name !== "fetch") {
          return;
        }

        const [, init] = node.arguments;

        if (init?.type !== "ObjectExpression") {
          return;
        }

        for (const property of init.properties) {
          const option = conflictingOption(property as Rule.Node, (target) =>
            context.sourceCode.getText(target),
          );

          if (option !== undefined) {
            options.push({ node: property as Rule.Node, option });
          }
        }
      },
      "Program:exit"() {
        if (!cached) {
          return;
        }

        for (const { node, option } of options) {
          context.report({ node, messageId: "noCacheOptionInUseCache", data: { option } });
        }
      },
    };
  },
};

export default noCacheOptionInUseCache;
