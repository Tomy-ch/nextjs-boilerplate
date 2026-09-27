import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { Rule } from "eslint";

import { HTTP_CLIENT_FACTORY } from "../architecture";
import { isServerCacheDirective } from "./cache-directive";
import { moduleSpecifiers, resolveModule } from "./module-resolution";

/**
 * サーバに保存されるキャッシュを持つモジュールから、user-scoped な取得の口を import させないルール
 * （`docs/rules.md`「データ分類と機微情報」の「サーバへ保存されるキャッシュから user-scoped な
 * 取得の口を引かない」）。
 *
 * `use cache` は**口の外側からモジュールごと**キャッシュへ入れるため、口の型では止まらない。
 * `use cache: private` はサーバへ保存されないので対象外。
 *
 * **判定は直接の import と、その 1 段先までを見る。** user-scoped の口は接続口の 1 か所で組まれ、
 * 取得の口を並べるモジュールは接続口を引くだけで分類の綴りを持たないため、直接の import だけでは
 * 取得の口へ届かない。1 段先で数えないのは client を組む kernel（`architecture.ts` の
 * `HTTP_CLIENT_FACTORY`）だけで、分類を型として宣言する kernel は両方の綴りを持ち、公開の接続口を
 * 経由するモジュールまで取り違えるためである。それより深い経路は取りこぼすが、そこは framework の
 * 防御 (cached scope からの `cookies()` 読み出し) と取得時の関門が覆う。
 *
 * **判定の単位はモジュールであって、import した名前ではない。** 口を作るモジュールが純粋な変換も
 * 一緒に export していると、変換だけを引いた `use cache` も止まる。名前ごとに口へ辿り着くかを
 * 追うには、export から `createHttpClient` までの到達可能性を解く必要があり、この段の役目
 * (キャッシュへ入れる前に止める) に見合わない。**止まったほうを直す** —— 口と一緒に居る変換は、
 * 引く側が増えた時点で自分のモジュールを持つに値する。
 *
 * 分類の宣言そのものを読む。写した一覧を持つと、口の宣言が動いたときに黙って古いままになる。
 * その読み方の帰結として、kernel を直接 import したときは kernel 自身も当たる。外さない —— `use cache`
 * の下で client をその場で組む形も、作る先が user-scoped なら同じ事故を作る。
 */
/** 取得の口が user-scoped を名乗る綴り。 */
const USER_SCOPED_DECLARATION = /scope:\s*"user-scoped"/;

/**
 * そのモジュールか、それが引く 1 段先のモジュールが user-scoped な取得の口を宣言しているか。
 *
 * 1 段先の綴りは、綴りを書いた 1 段目のファイルを起点に解決する。
 *
 * @param path - import 先の実ファイル
 * @param cwd - リポジトリの根
 * @returns 宣言していれば true
 */
function reachesUserScopedClient(path: string, cwd: string): boolean {
  const source = readFileSync(path, "utf8");

  if (USER_SCOPED_DECLARATION.test(source)) {
    return true;
  }

  const factory = resolve(cwd, HTTP_CLIENT_FACTORY);

  return moduleSpecifiers(source).some((specifier) => {
    const next = resolveModule(specifier, path, cwd);

    return (
      next !== undefined &&
      next !== factory &&
      USER_SCOPED_DECLARATION.test(readFileSync(next, "utf8"))
    );
  });
}

const noUserScopedInCachedModule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "サーバに保存されるキャッシュから user-scoped な取得の口を引かない",
    },
    schema: [],
    messages: {
      noUserScopedInCachedModule:
        "`{{specifier}}` は主体に紐づく取得の口を持つモジュールです。`use cache` の下から引くと、ある主体の値が別の主体へ配られます。取得を穴（Suspense の内側）へ落とすか、`use cache: private` を選んでください。口ではなく同居している純粋な変換だけが要るなら、その変換を別のモジュールへ出してください。",
    },
  },
  create(context) {
    const imports: { node: Rule.Node; specifier: string }[] = [];
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
      ImportDeclaration(node) {
        imports.push({ node, specifier: String(node.source.value) });
      },
      "Program:exit"() {
        if (!cached) {
          return;
        }

        for (const { node, specifier } of imports) {
          const path = resolveModule(specifier, context.filename, context.cwd);

          if (path !== undefined && reachesUserScopedClient(path, context.cwd)) {
            context.report({ node, messageId: "noUserScopedInCachedModule", data: { specifier } });
          }
        }
      },
    };
  },
};

export default noUserScopedInCachedModule;
