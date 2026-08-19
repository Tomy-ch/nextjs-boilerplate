import type { Preview } from "@storybook/nextjs-vite";
import { sb } from "storybook/test"; // sample:line

import { ToastProvider } from "@/components/shell/toaster/toaster";

import { startMockWorker } from "./msw/worker";
import { StoryErrorBoundary } from "./story-error-boundary";

import "../src/app/globals.css";
import "./preview.css";

// sample:begin
// Server Action を持つモジュールを、隣の `__mocks__` へ差し替える
// （[0054](../docs/adr/0054-ui-catalog-storybook.md)）。
//
// パスは拡張子まで書く。省くと解決に失敗し、宣言はしているのに 1 件も登録されないまま進む。
sb.mock(import("../src/features/account/actions.ts"));
sb.mock(import("../src/features/cart/actions.ts"));
sb.mock(import("../src/features/cart/facade/add-to-cart/add-to-cart.ts"));
sb.mock(import("../src/features/checkout/actions.ts"));
// sample:end

const SYSTEM_THEME = "system";

const preview: Preview = {
  // 同一オリジンの `/api/*` は [msw](msw/handlers.ts) が答える
  // （[0054](../docs/adr/0054-ui-catalog-storybook.md)）。story 側で `fetch` は差し替えない。
  loaders: [
    async () => {
      await startMockWorker();
    },
  ],
  globalTypes: {
    theme: {
      description: "配色テーマ",
      toolbar: {
        title: "Theme",
        icon: "contrast",
        items: [
          { value: SYSTEM_THEME, title: "OS の設定に従う" },
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: SYSTEM_THEME,
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme;
      // tokens.css と globals.css の dark variant は :root の data-theme を見る。
      // 属性を外すと OS の設定に戻る。
      if (theme === SYSTEM_THEME) {
        document.documentElement.removeAttribute("data-theme");
      } else {
        document.documentElement.setAttribute("data-theme", String(theme));
      }

      return Story(context);
    },
    // 実アプリが横断 Provider を layout shell へ mount するのと同じ位置に置く
    // （[0026](../docs/adr/0026-layout-shell-mount.md)）。story ごとに包むと、包み忘れた story は
    // 部品ではなく Storybook のエラー画面を描き、それが基準画像として承認されうる。
    (Story) => <ToastProvider>{Story()}</ToastProvider>,
    // 例外はカタログの中で受け止める。赤いスタックの画面は fork 先への説明にならない一方、
    // 無かったことにすると壊れた story が緑のまま残る。見え方だけを穏やかにし、起きたことは
    // 文言・`data-story-error`・console に残す。story ごとに作り直すため key を与える。
    (Story, context) => <StoryErrorBoundary key={context.id}>{Story()}</StoryErrorBoundary>,
  ],
  parameters: {
    a11y: {
      test: "error",
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextjs: {
      // このリポジトリは App Router のみを使う (ADR 0040)。useRouter などの
      // navigation hook は App Router の context が無いと throw するため、既定で有効にする。
      appDirectory: true,
    },
    options: {
      storySort: {
        // sidebar の見出しは component 目録の見出し (shadcn-manifest.yaml の `as`) と同じ。
        // 目録の並びは sidebar には持ち込まず、見出し・story とも名前順で引けるようにする。
        method: "alphabetical",
        // 画面 → 画面固有の部品 → 目録の順に置く。組んでいる間に開くのは前の 2 つで、
        // 目録は参照物として後ろにある方が探す手数が少ない。以降は名前順に戻す。
        order: ["Page", "Features", "*"],
      },
    },
  },
  // component の description と story ごとの説明は Docs ページにしか出ない。
  // 付けないと、story に書いた「何のための部品か」がどこにも表示されないまま残る。
  tags: ["autodocs"],
};

export default preview;
