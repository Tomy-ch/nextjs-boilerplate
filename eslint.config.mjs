// Biome では import 元の層ごとの依存方向を表現できないため、境界検査だけを担う。
// このファイルは手書きで管理する。整形・汎用 lint は Biome の責務。
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";

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
  { ignores: [".next/**", "node_modules/**", "out/**", "graphify-out/**"] },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    languageOptions: { parser: tseslint.parser },
    plugins: { boundaries },
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
    },
  },
];
