// Biome では import 元の層ごとの依存方向を表現できないため、境界検査だけを担う。
// 整形・汎用 lint は Biome の責務。
//
// 依存マトリクスは architecture.ts が正であり、ここは宣言を写さず import して強制へ変換する。
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";

import { DEPENDENCIES, KERNELS } from "./architecture";
import noInternalAnchor from "./eslint-rules/no-internal-anchor.mjs";

const elements = KERNELS.map((type) => ({ type, pattern: `src/${type}`, partialMatch: false }));

export default [
  {
    ignores: [
      ".next/**",
      "coverage/**",
      "node_modules/**",
      "out/**",
      "storybook-static/**",
      "graphify-out/**",
      // 配信ツリーの組み立て先。docs の複製と Storybook / ビューアーのバンドルが入る。
      // ワークスペースのパッケージ配下にも出るため先頭を固定しない。
      "**/dist/**",
    ],
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    languageOptions: { parser: tseslint.parser },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      boundaries,
      "project-rules": { rules: { "no-internal-anchor": noInternalAnchor } },
    },
    settings: {
      // 境界検査は import 先を実ファイルまで解決できて初めて成立する。解決できない import は
      // 「どの層でもない」と見なされ、違反があっても黙って通る。`@/*` を含めて解決させる。
      "import/resolver": { typescript: { project: "./tsconfig.json" } },
      "boundaries/include": ["src/**/*"],
      "boundaries/elements": elements,
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: Object.entries(DEPENDENCIES).map(([from, types]) => ({
            from: { element: { type: from } },
            allow: { to: { element: { types: { anyOf: types } } } },
          })),
        },
      ],
      "project-rules/no-internal-anchor": "error",
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        {
          assertionStyle: "never",
        },
      ],
    },
  },
  {
    files: ["src/errors/**/*.{js,jsx,ts,tsx}"],
    ignores: ["src/errors/**/*.test.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Identifier[name=/^(http|status|response)$/i]",
          message: "errors カーネルへ transport 語彙を持ち込んではいけません。",
        },
        {
          selector: "Literal[value=/\\bhttps?\\b/i]",
          message: "errors カーネルへ transport 語彙を持ち込んではいけません。",
        },
      ],
    },
  },
];
