import type { Rule, Scope } from "eslint";

/**
 * 資格情報の取得口に、その場で組んだ関数やローカルの値を渡させないルール。
 *
 * `use cache` の下で user-scoped な取得を止めているのは framework 側の防御で、それは
 * **資格情報が使用地点で `cookies()` から解決されること**にぶら下がっている
 * ([0112](../docs/adr/0112-data-classification-cache-boundary.md) 決定 5)。解決済みの値を掴んだ
 * 関数を渡すと `cookies()` が読まれず、`next-request-in-use-cache` は何も言わずに黙る。**外れた
 * ことが誰にも見えない**のがこの形の危うさで、だから前提そのものを検査の対象にする。
 *
 * 通すのは **import した口だけ**である。その場で組んだ関数は掴んだ値を隠せるが、import された
 * 口は宣言が 1 か所にあり、そこを読めば解決の経路が分かる。
 *
 * 確立中の 1 往復（cookie がまだ無い）は `bearerToken` という別の綴りが持つ。綴りを分けてある
 * のは、防御が外れる箇所を数えられるようにするためである。
 *
 * テストは対象外にする。取得口の振る舞いを確かめる側であり、束には載らない。
 */
const RESOLVER_PROPERTY = "getBearerToken";

/**
 * 名前が指す変数を、内側の scope から順に探す。見つからなければ `undefined`。
 *
 * 参照の解決を scope の連なりで行うのは、渡す口が module の直下で import され、渡す側が関数の
 * 中に居るためである。手前の scope だけを見ると、その全部を取りこぼす。
 */
function findVariable(scope: Scope.Scope | null, name: string): Scope.Variable | undefined {
  for (let current = scope; current !== null; current = current.upper) {
    const found = current.variables.find((variable) => variable.name === name);

    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
}

/** テストか。 */
function isTest(filename: string): boolean {
  return /\.test\.[cm]?[jt]sx?$/.test(filename);
}

const noCapturedBearerToken: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "資格情報は使用地点で解決する口を渡す",
    },
    schema: [],
    messages: {
      noCapturedBearerToken:
        "`getBearerToken` には import した取得口を渡してください。掴んだ値を返す関数を渡すと `cookies()` が読まれず、cached scope の防御が黙って外れます。確立中の 1 往復は `bearerToken` を使ってください。",
    },
  },
  create(context) {
    return {
      Property(node) {
        const key = node.key;
        const named =
          (key.type === "Identifier" && key.name === RESOLVER_PROPERTY) ||
          (key.type === "Literal" && key.value === RESOLVER_PROPERTY);

        // 見るのは値を渡す側だけである。分解代入の同じ綴りは受け取る側で、渡された口をそのまま
        // 束縛しているに過ぎない。
        if (
          !named ||
          node.computed ||
          node.parent.type !== "ObjectExpression" ||
          isTest(context.filename)
        ) {
          return;
        }

        const value = node.value;

        if (value.type !== "Identifier") {
          context.report({ node, messageId: "noCapturedBearerToken" });

          return;
        }

        const variable = findVariable(context.sourceCode.getScope(node), value.name);

        if (variable?.defs.some((definition) => definition.type === "ImportBinding") !== true) {
          context.report({ node, messageId: "noCapturedBearerToken" });
        }
      },
    };
  },
};

export default noCapturedBearerToken;
