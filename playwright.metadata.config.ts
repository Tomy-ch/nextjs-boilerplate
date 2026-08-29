import { defineConfig, devices } from "@playwright/test";

import { deviceFor, SHOT_ENGINE } from "./e2e/lib/browsers";

/**
 * 索引させる設定で起動したアプリの公開面を読む設定。
 *
 * @remarks
 * 巡回（`playwright.e2e.config.ts`）と分けてあるのは、**開く相手の build が違う**ためです。
 * `SITE_INDEXABLE` は build 時に焼き込まれるので（`src/config/site/site.server.ts`）、同じ 1 回の
 * build へ混ぜられません。
 *
 * **基準画像を撮りません。** 見るのはクローラが読む応答の成立であって見た目ではないため、
 * 描画エンジンは 1 つで足ります。
 */
const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e/metadata",
  testMatch: "**/*.spec.ts",
  outputDir: "tmp/e2e/metadata-results",
  fullyParallel: true,
  timeout: 60_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    timezoneId: "Asia/Tokyo",
    locale: "ja-JP",
    trace: "retain-on-failure",
  },
  projects: [{ name: SHOT_ENGINE, use: { ...devices[deviceFor(SHOT_ENGINE)] } }],
});
