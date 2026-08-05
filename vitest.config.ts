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
      include: ["src/**/*.{ts,tsx}", "docs-viewer/src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.stories.{ts,tsx}",
        "docs-viewer/src/**/*.test.{ts,tsx}",
        "docs-viewer/src/**/*.stories.{ts,tsx}",
        // ビューアーの entry。読み込まれた時点で DOM を触るため import しただけで副作用が出る。
        // 判断はすべて mount/mount-portal.tsx 側にあり、そちらは検査対象に残している。
        "docs-viewer/src/main.tsx",
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
