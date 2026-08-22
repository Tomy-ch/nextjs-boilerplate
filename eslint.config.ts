// Biome では import 元の層ごとの依存方向を表現できないため、境界検査だけを担う。
// 整形・汎用 lint は Biome の責務。
//
// 依存マトリクスは architecture.ts が正であり、ここは宣言を写さず import して強制へ変換する。
import boundaries from "eslint-plugin-boundaries";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

import {
  DEPENDENCIES,
  ENTRY_POINTS,
  KERNEL_PATTERNS,
  KERNELS,
  RESTRICTED_AREAS,
  SHARED_AREAS,
} from "./architecture";
import noAnonymousDefaultExport from "./eslint-rules/no-anonymous-default-export";
import noInternalAnchor from "./eslint-rules/no-internal-anchor";
import noMarkupOutsideUiLayers from "./eslint-rules/no-markup-outside-ui-layers";
import noRawFontWeight from "./eslint-rules/no-raw-font-weight";

const elements = [
  // 層より先に並べる。区画は層の内側にあるため、層の要素が先に一致すると区画としては
  // 見えなくなり、層の粒度の許可がそのまま区画への許可になる。
  ...RESTRICTED_AREAS.map(({ type, pattern }) => ({ type, pattern, partialMatch: false })),
  ...SHARED_AREAS.map(({ type, pattern }) => ({ type, pattern, partialMatch: false })),
  ...KERNELS.map((type) => ({
    type,
    pattern: KERNEL_PATTERNS[type] ?? `src/${type}`,
    partialMatch: false,
  })),
];

export default [
  {
    ignores: [
      ".next/**",
      "coverage/**",
      "node_modules/**",
      "out/**",
      "storybook-static/**",
      // カタログへ配る資材の置き場。中身は依存が持つ生成物で、書き手が居ない。
      ".storybook/public/**",
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
      "react-hooks": reactHooks,
      "project-rules": {
        rules: {
          "no-anonymous-default-export": noAnonymousDefaultExport,
          "no-internal-anchor": noInternalAnchor,
          "no-markup-outside-ui-layers": noMarkupOutsideUiLayers,
          "no-raw-font-weight": noRawFontWeight,
        },
      },
    },
    settings: {
      "boundaries/files": ENTRY_POINTS.map(({ category, pattern }) => ({ category, pattern })),
      // 境界検査は import 先を実ファイルまで解決できて初めて成立する。解決できない import は
      // 「どの層でもない」と見なされ、違反があっても黙って通る。`@/*` を含めて解決させる。
      "import/resolver": { typescript: { project: "./tsconfig.json" } },
      "boundaries/include": [
        "src/**/*",
        ...RESTRICTED_AREAS.map(({ pattern }) => `${pattern}/**/*`),
        ...SHARED_AREAS.map(({ pattern }) => `${pattern}/**/*`),
      ],
      "boundaries/elements": elements,
    },
    rules: {
      // Biome では effect で state を導出する形や描画中の副作用を表現できないため、React Compiler
      // 由来の診断だけを担う。有効化するルールの選び方は 0002 が正。
      "react-hooks/capitalized-calls": "error",
      "react-hooks/error-boundaries": "error",
      "react-hooks/gating": "error",
      "react-hooks/globals": "error",
      "react-hooks/immutability": "error",
      "react-hooks/incompatible-library": "error",
      "react-hooks/memoized-effect-dependencies": "error",
      "react-hooks/no-deriving-state-in-effects": "error",
      "react-hooks/preserve-manual-memoization": "error",
      "react-hooks/purity": "error",
      "react-hooks/refs": "error",
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/set-state-in-render": "error",
      "react-hooks/static-components": "error",
      "react-hooks/unsupported-syntax": "error",
      "react-hooks/use-memo": "error",
      "react-hooks/void-use-memo": "error",
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            ...Object.entries(DEPENDENCIES).map(([from, types]) => ({
              from: { element: { type: from } },
              allow: { to: { element: { types: { anyOf: types } } } },
            })),
            // 区画自身の依存。層としては `features` に居るが、要素としては別の型になるため、
            // 層の policy が当たらない。
            ...SHARED_AREAS.map(({ type, dependencies }) => ({
              from: { element: { type } },
              allow: { to: { element: { types: { anyOf: dependencies } } } },
            })),
            ...SHARED_AREAS.map(({ type, allowedFrom }) => ({
              from: { element: { types: { anyOf: allowedFrom } } },
              allow: { to: { element: { type } } },
            })),
            // 画面まるごとの story は feature を跨いで組むため、面にも届く必要がある。
            ...SHARED_AREAS.flatMap(({ type, allowedFromCategories }) =>
              allowedFromCategories.map((category) => ({
                from: { file: { categories: category } },
                allow: { to: { element: { type } } },
              })),
            ),
            // 区画自身の依存。層の許可は要素の型に当たるため、区画へ切り出すと層の許可が届かない。
            ...RESTRICTED_AREAS.filter(({ dependencies }) => dependencies.length > 0).map(
              ({ type, dependencies }) => ({
                from: { element: { type } },
                allow: { to: { element: { types: { anyOf: dependencies } } } },
              }),
            ),
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
      "project-rules/no-anonymous-default-export": "error",
      "project-rules/no-internal-anchor": "error",
      "project-rules/no-markup-outside-ui-layers": "error",
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        {
          assertionStyle: "never",
        },
      ],
    },
  },
  {
    // 太さの直接指定は画面が使う class にだけ禁じる。test は部品が持つ class を確かめる側で、
    // story は見本であり、どちらも画面が使う class ではない。
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    ignores: ["src/**/*.test.{js,jsx,ts,tsx}", "src/**/*.stories.{js,jsx,ts,tsx}"],
    rules: {
      "project-rules/no-raw-font-weight": "error",
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
