import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // src の外にも実行可能なテストがある。tokens と scripts の生成物・書き出しは
    // アプリのコードではないが、壊れると生成物が黙って変わるため同じ suite で回す。
    // docs-viewer は別パッケージだが、同じ gate に載せる。別 suite にすると片方だけが
    // 緑という状態を作れてしまい、CI の判定が「全部通った」を意味しなくなる。
    include: ["{src,scripts,tokens,docs-viewer}/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      // テストを持つ範囲は実行対象と計測対象を揃える。片方だけ広げると、テストは走るのに
      // ゲートに載らない範囲ができ、未テストの分岐を足しても緑のまま通る（ADR 0090）。
      //
      // scripts/ のうち portal 以外（actions-pin / actions-shellcheck / setup / lib）は
      // 現時点でテストを持たないため計測対象へ入れていない。これは記録された除外であって
      // 暗黙の穴ではない。撤去条件は当該スクリプト群にテストが入った時点。
      include: [
        "src/**/*.{ts,tsx}",
        "docs-viewer/src/**/*.{ts,tsx}",
        "scripts/architecture/**/*.ts",
        "scripts/openapi/**/*.ts",
        "scripts/portal/**/*.ts",
        "tokens/**/*.ts",
      ],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.stories.{ts,tsx}",
        "docs-viewer/src/**/*.test.{ts,tsx}",
        "docs-viewer/src/**/*.stories.{ts,tsx}",
        // ビューアーの entry。読み込まれた時点で DOM を触るため import しただけで副作用が出る。
        // 判断はすべて mount/mount-portal.tsx 側にあり、そちらは検査対象に残している。
        "docs-viewer/src/main.tsx",
        // CLI entry。判断は同ディレクトリの純粋関数側にあり、こちらは FS 入出力と
        // 引数の受け渡しだけを持つ。撤去条件は CLI 側が判断を持ち始めた時点。
        "scripts/architecture/check-boundaries.ts",
        "scripts/openapi/fetch-api.ts",
        "scripts/portal/gen-docs-json.ts",
        "scripts/portal/gen-portal-docs.ts",
        "scripts/portal/build-site.ts",
      ],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
});
