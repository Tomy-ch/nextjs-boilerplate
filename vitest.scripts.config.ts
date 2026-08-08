import { defineConfig } from "vitest/config";

import { EXCLUDED_FROM_CHECKS } from "./scripts/lib/untested-modules";

/**
 * 補助スクリプト(`scripts/**&#47;*.ts`)の suite。
 *
 * アプリ本体の suite ([vitest.config.ts](vitest.config.ts)) と分けるのは、検査する対象が
 * 違うから。`scripts/` に居るのは lint とゲートそのもので、壊れると「違反なし」を報告する
 * 向きに倒れる。落ちたときにアプリの退行と読み違えないよう、実行も CI のジョブも分ける。
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["scripts/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // 母数はディレクトリの列挙ではなく全 `.ts` に取る。ツールのディレクトリを足したとき
      // 黙って母数から漏れるのを避ける。外すのは除外宣言だけ。
      include: ["scripts/**/*.ts"],
      exclude: [...EXCLUDED_FROM_CHECKS],
      reporter: ["text"],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
});
