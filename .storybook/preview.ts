import type { Preview } from "@storybook/nextjs-vite";

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
      },
    },
  },
  // component の description と story ごとの説明は Docs ページにしか出ない。
  // 付けないと、story に書いた「何のための部品か」がどこにも表示されないまま残る。
  tags: ["autodocs"],
};

export default preview;
