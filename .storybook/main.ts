import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/nextjs-vite";

/** カタログだけへ配る資材の置き場。追跡しない。 */
const catalogAssets = fileURLToPath(new URL("./public", import.meta.url));

/**
 * 取得を横取りする service worker を、依存が持つ実体からカタログの資材へ写す。
 *
 * 起動コマンドではなくここで写すのは、置き忘れた状態で `storybook build` に入ると
 * `staticDirs` の解決で落ちるためで、その前提を script の書き方に依存させない。
 */
function copyMockServiceWorker(): void {
  mkdirSync(catalogAssets, { recursive: true });
  copyFileSync(
    createRequire(import.meta.url).resolve("msw/mockServiceWorker.js"),
    `${catalogAssets}/mockServiceWorker.js`,
  );
}

copyMockServiceWorker();

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  // アプリの資材（`public/`）と、カタログだけが要る資材を分けて配る。`public/` へ置くと、
  // 本番の配信物に検証用の資材が混ざる。
  staticDirs: ["../public", "./public"],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
};

export default config;
