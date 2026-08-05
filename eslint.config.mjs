// Biome では import 元の層ごとの依存方向を表現できないため、境界検査だけを担う。
// このファイルは手書きで管理する。整形・汎用 lint は Biome の責務。
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";

const projectRules = {
  rules: {
    "no-internal-anchor": {
      meta: {
        type: "problem",
        docs: {
          description: "内部リンクには next/link を使う",
        },
        schema: [],
        messages: {
          noInternalAnchor: "内部リンクには <a> ではなく next/link を使ってください。",
        },
      },
      create(context) {
        return {
          JSXOpeningElement(node) {
            if (node.name.type !== "JSXIdentifier" || node.name.name !== "a") {
              return;
            }

            const href = node.attributes.find(
              (attribute) => attribute.type === "JSXAttribute" && attribute.name.name === "href",
            );

            if (
              href?.type !== "JSXAttribute" ||
              href.value?.type !== "Literal" ||
              typeof href.value.value !== "string" ||
              !href.value.value.startsWith("/")
            ) {
              return;
            }

            context.report({ node, messageId: "noInternalAnchor" });
          },
        };
      },
    },
  },
};

const elements = [
  "app",
  "features",
  "model",
  "components",
  "adapters",
  "capabilities",
  "stores",
  "config",
  "errors",
  "logging",
  "observability",
].map((type) => ({ type, pattern: `src/${type}/**/*` }));

const allow = {
  app: [
    "features",
    "components",
    "capabilities",
    "stores",
    "adapters",
    "errors",
    "logging",
    "config",
    "model",
  ],
  features: ["model", "components", "adapters", "capabilities", "stores", "errors", "logging"],
  model: ["errors"],
  components: ["model", "errors"],
  adapters: ["model", "errors", "logging", "config"],
  capabilities: ["model", "errors", "logging", "config"],
  stores: ["model", "errors", "config"],
  config: [],
  errors: [],
  logging: [],
  observability: [],
};

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
      "project-rules": projectRules,
    },
    settings: {
      "boundaries/include": ["src/**/*"],
      "boundaries/elements": elements,
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: Object.entries(allow).map(([from, types]) => ({
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
