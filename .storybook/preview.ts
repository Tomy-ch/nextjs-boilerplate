import type { Preview } from "@storybook/nextjs-vite";
import { createElement } from "react";

import { ToastProvider } from "../src/components/shell/toaster/toaster";
import { StoryErrorBoundary } from "./story-error-boundary";

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
    // 通知の供給は root layout（`src/app/layout.tsx`）が持つ。カタログでも同じ位置に置くのは、
    // 部品の側が「どこかに Provider が居る」前提で `useToast` を呼ぶためで、置かないと通知を
    // 出しうる部品を含む story が開いた時点で落ちる。JSX を使わないのは、この設定が `.ts`
    // だからである。
    (Story, context) => createElement(ToastProvider, null, Story(context)),
    // 例外はカタログの中で受け止める。赤いスタックの画面は fork 先への説明にならない一方、
    // 無かったことにすると壊れた story が緑のまま残る。見え方だけを穏やかにし、起きたことは
    // 文言・`data-story-error`・console に残す。story ごとに作り直すため key を与える。
    (Story, context) => createElement(StoryErrorBoundary, { key: context.id }, Story(context)),
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
