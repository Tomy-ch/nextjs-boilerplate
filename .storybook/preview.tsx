import type { Preview } from "@storybook/nextjs-vite";

import { ToastProvider } from "@/components/shell/toaster/toaster";

import "../src/app/globals.css";
import "./preview.css";

const SYSTEM_THEME = "system";

const preview: Preview = {
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
