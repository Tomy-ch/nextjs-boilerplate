import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

import { EXCLUDED_FROM_CHECKS } from "./scripts/lib/untested-modules";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // src の外にも実行可能なテストがある。tokens の書き出しはアプリのコードではないが、
    // 壊れると生成物が黙って変わるため同じ suite で回す。docs-viewer は別パッケージだが、
    // 同じ gate に載せる。別 suite にすると片方だけが緑という状態を作れてしまい、CI の判定が
    // 「全部通った」を意味しなくなる。
    //
    // `scripts/` だけは [vitest.scripts.config.ts](vitest.scripts.config.ts) の別 suite で回す。
    // あちらに居るのは lint とゲートそのもので、落ちたときにアプリの退行と読み違えたくない。
    include: ["{src,tokens,docs-viewer,mocks,eslint-rules,vrt}/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      // テストを持つ範囲は実行対象と計測対象を揃える。片方だけ広げると、テストは走るのに
      // ゲートに載らない範囲ができ、未テストの分岐を足しても緑のまま通る（ADR 0090）。
      include: [
        "src/**/*.{ts,tsx}",
        "docs-viewer/src/**/*.{ts,tsx}",
        "tokens/**/*.ts",
        "eslint-rules/**/*.ts",
        "vrt/**/*.ts",
      ],
      // 検査対象から外すモジュールは scripts/lib/untested-modules.ts の宣言 1 箇所が持ち、
      // カバレッジ母数と 1:1 ゲートの双方がそれを読む（ADR 0090）。ここへ直接足すと、
      // ゲート側だけが要求し続ける／カバレッジ側だけが要求し続けるずれが黙って生まれる。
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.stories.{ts,tsx}",
        "docs-viewer/src/**/*.test.{ts,tsx}",
        "docs-viewer/src/**/*.stories.{ts,tsx}",
        "eslint-rules/**/*.test.ts",
        "vrt/**/*.test.ts",
        ...EXCLUDED_FROM_CHECKS,
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
