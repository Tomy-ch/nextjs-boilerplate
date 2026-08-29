import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

/** Next.js 同梱の experimental React 一式の位置。 */
export type ExperimentalReactPaths = {
  /** react-server 条件で読む React 本体。taint の登録簿を持つ。 */
  readonly react: string;
  /** 同じ条件の React DOM。直列化器が要求する。 */
  readonly reactDom: string;
  /** RSC の直列化器。 */
  readonly serverDom: string;
};

/**
 * Next.js 同梱の experimental React 一式の位置を返す。
 *
 * @remarks
 * `experimental.taint` を立てた Next.js が RSC の描画に使うのはこのビルドで、stable の `react` は
 * taint の口を持ちません（[0030](../../../../docs/adr/0030-environment-variable-management.md) §8）。
 * **テストだけが読みます** —— 本番は Next.js が `react` の解決先をこちらへ差し替えるので、
 * アプリのコードは `react` を綴るだけで足ります（`scripts/lib/untested-modules.ts` の
 * `TEST_FIXTURE_MODULES`）。
 *
 * 実体の位置は pnpm の配置で変わるため、`next` の package から辿ります。同じ実体を CJS の名前解決へ
 * 渡すので、symlink を解いた形で返します。
 */
export function experimentalReactPaths(): ExperimentalReactPaths {
  const compiled = path.join(
    path.dirname(createRequire(import.meta.url).resolve("next/package.json")),
    "dist/compiled",
  );

  return {
    react: realpathSync(path.join(compiled, "react-experimental/react.react-server.js")),
    reactDom: realpathSync(path.join(compiled, "react-dom-experimental/react-dom.react-server.js")),
    serverDom: realpathSync(
      path.join(compiled, "react-server-dom-webpack-experimental/server.node.js"),
    ),
  };
}
