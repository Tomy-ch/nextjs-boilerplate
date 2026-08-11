// Biome では import 元の層ごとの依存方向を表現できないため、境界検査だけを担う。
// 整形・汎用 lint は Biome の責務。
//
// 依存マトリクスは architecture.ts が正であり、ここは宣言を写さず import して強制へ変換する。
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";

import { DEPENDENCIES, ENTRY_POINTS, KERNELS, RESTRICTED_AREAS } from "./architecture";
import noInternalAnchor from "./eslint-rules/no-internal-anchor";

const elements = [
  // 層より先に並べる。区画は層の内側にあるため、層の要素が先に一致すると区画としては
  // 見えなくなり、層の粒度の許可がそのまま区画への許可になる。
  ...RESTRICTED_AREAS.map(({ type, pattern }) => ({ type, pattern, partialMatch: false })),
  ...KERNELS.map((type) => ({ type, pattern: `src/${type}`, partialMatch: false })),
];

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
      "boundaries/files": ENTRY_POINTS.map(({ category, pattern }) => ({ category, pattern })),
      // 境界検査は import 先を実ファイルまで解決できて初めて成立する。解決できない import は
      // 「どの層でもない」と見なされ、違反があっても黙って通る。`@/*` を含めて解決させる。
      "import/resolver": { typescript: { project: "./tsconfig.json" } },
      "boundaries/include": [
        "src/**/*",
        ...RESTRICTED_AREAS.map(({ pattern }) => `${pattern}/**/*`),
      ],
      "boundaries/elements": elements,
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            ...Object.entries(DEPENDENCIES).map(([from, types]) => ({
              from: { element: { type: from } },
              allow: { to: { element: { types: { anyOf: types } } } },
            })),
            ...RESTRICTED_AREAS.filter(({ allowedFrom }) => allowedFrom.length > 0).map(
              ({ type, allowedFrom }) => ({
                from: { element: { types: { anyOf: allowedFrom } } },
                allow: { to: { element: { type } } },
              }),
            ),
            ...RESTRICTED_AREAS.filter(
              ({ allowedFromCategories }) => allowedFromCategories.length > 0,
            ).map(({ type, allowedFromCategories }) => ({
              from: { file: { categories: allowedFromCategories } },
              allow: { to: { element: { type } } },
            })),
            ...ENTRY_POINTS.map(({ category, dependencies }) => ({
              from: { file: { categories: category } },
              allow: { to: { element: { types: { anyOf: dependencies } } } },
            })),
            // co-location したテストが対象を読む経路。カーネル内では同一層の import に収まるが、
            // エントリは層を持たないため category 内の相互参照として明示する。
            ...ENTRY_POINTS.map(({ category }) => ({
              from: { file: { categories: category } },
              allow: { to: { file: { categories: category } } },
            })),
          ],
        },
      ],
      "boundaries/no-unknown-files": "error",
      "boundaries/no-unknown-dependencies": "error",
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
