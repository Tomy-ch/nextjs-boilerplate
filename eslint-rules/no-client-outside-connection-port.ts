import { relative, resolve } from "node:path";

import type { Rule } from "eslint";

import { CONNECTION_PORTS, HTTP_CLIENT_FACTORY } from "../architecture";
import { resolveModule } from "./module-resolution";

/**
 * 外部 API を叩く client を、接続口の外で組ませないルール（`docs/rules.md`「取得と契約」の
 * 「接続口は downstream と分類の組ごとに 1 つ」）。
 *
 * 遮断器と再試行の予算は client の中に状態として載るため、同じ接続先へ client を分けると劣化の
 * 判断が分けた数だけ割れる。組んでよいのは [`architecture.ts`](../architecture.ts) の
 * `CONNECTION_PORTS` だけで、それ以外で組む箇所は `eslint-disable-next-line` に理由を書いて名乗る。
 *
 * **判定は import の綴りを実ファイルへ解決してから行う。** server 側と client 側の要求境界は同じ
 * `../http/request` という綴りを持つため、綴りだけでは区別できない。解決した先が
 * `HTTP_CLIENT_FACTORY` のときだけを見る。
 *
 * 落とすのは、組み立ての関数を値として引く形すべて —— 名前付き（別名を含む）、名前空間、
 * `export … from` / `export * from` による再 export、動的な `import()`。型だけの import は client を
 * 組まないので通す。報告は宣言そのものに出す。`eslint-disable-next-line` が効くのは宣言の先頭行だけ
 * だからである。
 *
 * テストは対象外にする。組み立ての振る舞いを確かめる側であり、束には載らない。
 */
/** 外部 API を叩く client を組む関数の名前。 */
const FACTORY_NAME = "createHttpClient";

/**
 * テストか。
 *
 * @param filename - lint 対象のファイル
 * @returns テストなら true
 */
function isTest(filename: string): boolean {
  return /\.test\.[cm]?[jt]sx?$/.test(filename);
}

/**
 * 綴りが組み立ての kernel を指しているか。
 *
 * @param specifier - import / export の綴り。文字列でなければ kernel ではない
 * @param filename - 綴りを書いたファイル
 * @param cwd - リポジトリの根
 * @returns kernel を指していれば true
 */
function isFactory(specifier: unknown, filename: string, cwd: string): boolean {
  return (
    typeof specifier === "string" &&
    resolveModule(specifier, filename, cwd) === resolve(cwd, HTTP_CLIENT_FACTORY)
  );
}

/**
 * 型だけを運ぶ宣言か。
 *
 * `importKind` / `exportKind` は TypeScript の構文木にしか無く、ESLint の型（estree）は持たない。
 *
 * @param node - import / export の宣言か、その指定子
 * @param kind - 見るプロパティ
 * @returns 型だけなら true
 */
function isTypeOnly(node: object, kind: "importKind" | "exportKind"): boolean {
  return Reflect.get(node, kind) === "type";
}

/**
 * import / export の指定子が指している、kernel 側の名前。
 *
 * @param node - 識別子か、文字列の名前
 * @returns kernel 側の名前
 */
function exportedName(node: { type: string; name?: unknown; value?: unknown }): unknown {
  return node.type === "Identifier" ? node.name : node.value;
}

const noClientOutsideConnectionPort: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "外部 API を叩く client を接続口の外で組まない",
    },
    schema: [],
    messages: {
      noClientOutsideConnectionPort:
        "`createHttpClient` を組めるのは接続口（`architecture.ts` の `CONNECTION_PORTS`）だけです。同じ接続先へ client を分けると、遮断器と再試行の予算が分けた数だけ割れます。`getPublicClient()` / `getUserScopedClient()` を引いてください。接続先を呼び出しごとに受け取るなど接続口へ寄せられない場合は、`eslint-disable-next-line` に理由を書いてください。",
    },
  },
  create(context) {
    const { cwd, filename } = context;

    if (isTest(filename) || CONNECTION_PORTS.some((port) => port === relative(cwd, filename))) {
      return {};
    }

    /**
     * 接続口の外で client を組む宣言として報告する。
     *
     * @param node - 報告する宣言。抑止が効くのはこの先頭行だけ
     */
    const report = (node: Rule.Node): void => {
      context.report({ node, messageId: "noClientOutsideConnectionPort" });
    };

    return {
      ImportDeclaration(node) {
        if (isTypeOnly(node, "importKind") || !isFactory(node.source.value, filename, cwd)) {
          return;
        }

        const buildsClient = node.specifiers.some(
          (specifier) =>
            specifier.type === "ImportNamespaceSpecifier" ||
            (specifier.type === "ImportSpecifier" &&
              !isTypeOnly(specifier, "importKind") &&
              exportedName(specifier.imported) === FACTORY_NAME),
        );

        if (buildsClient) {
          report(node);
        }
      },
      ExportNamedDeclaration(node) {
        if (isTypeOnly(node, "exportKind") || !isFactory(node.source?.value, filename, cwd)) {
          return;
        }

        const reexportsFactory = node.specifiers.some(
          (specifier) =>
            !isTypeOnly(specifier, "exportKind") && exportedName(specifier.local) === FACTORY_NAME,
        );

        if (reexportsFactory) {
          report(node);
        }
      },
      ExportAllDeclaration(node) {
        if (!isTypeOnly(node, "exportKind") && isFactory(node.source.value, filename, cwd)) {
          report(node);
        }
      },
      ImportExpression(node) {
        if (node.source.type === "Literal" && isFactory(node.source.value, filename, cwd)) {
          report(node);
        }
      },
    };
  },
};

export default noClientOutsideConnectionPort;
