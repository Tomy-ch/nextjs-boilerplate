/**
 * 層構造の宣言。依存マトリクスの単一の正であり、ESLint の境界検査（`eslint.config.ts`）と
 * 層 README の frontmatter 突合（`scripts/architecture/`）の双方がここを読む。
 *
 * @remarks
 * 宣言と強制を別々に書くと、片方だけを直したコミットが何にも咎められずに通ります。マトリクスの
 * 表現をこの 1 ファイルに閉じ、強制側は生成でも複製でもなく直接の import で受け取ります。
 *
 * 責務そのものは ADR で決まります。ここが持つのは「どの層がどの層を import できるか」だけで、
 * 各層が何を担うかは [0021](docs/adr/0021-frontend-responsibility.md) が正です。
 */

/** 物理化されている層。`src/<kernel>/` に 1 対 1 で対応する。 */
export const KERNELS = [
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
] as const;

export type Kernel = (typeof KERNELS)[number];

/**
 * 層ごとに import を許す層。ここに無い組み合わせはすべて禁止される。
 *
 * @remarks
 * 依存は内向きの一方向です。`app` が最も外側で、`errors` / `logging` / `observability` /
 * `config` は他の層を参照しない末端に置きます。`features` が `features` を含まないのは、
 * 機能スライス同士の相互参照を禁じているためです。
 */
export const DEPENDENCIES = {
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
} as const satisfies Record<Kernel, readonly Kernel[]>;
