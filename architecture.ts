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

/**
 * 起動 / ビルド境界のエントリ。置き場を framework が決めるためカーネルの下へ入れられない。
 *
 * @remarks
 * カーネルではないので README も層も持ちませんが、分類の外へ出すと「どの層でもない」ファイルが
 * 正常系に紛れ、未分類を検出するガードが機能しなくなります。層と同じ表に載せて分類させます。
 */
export const ENTRY_POINTS = [
  {
    category: "bootstrap",
    pattern: "src/instrumentation*",
    dependencies: ["config", "logging", "observability"],
  },
] as const satisfies readonly {
  category: string;
  pattern: string;
  dependencies: readonly Kernel[];
}[];

/**
 * 名指しした相手からしか import できない区画。
 *
 * @remarks
 * 境界検査が働くのは宣言された要素の間だけです。層より細かい単位や `src/` の外は、宣言しない
 * 限り違反ではなく「検査の対象外」として黙って通ります。区画を独立した要素として宣言し、許す
 * 相手を名指しすることで、層の粒度では表せない制約を機械で持ちます。
 *
 * - `adapters-gen`: 契約から生成した wire 型。`adapters` の内側にあるため、層として `adapters` を
 *   import できる `app` / `features` から素通しで届き、生成型が内層へ漏れます([0020](docs/adr/0020-adopted-architecture.md) 設計原則 3)
 * - `mocks`: 契約駆動モック([0027](docs/adr/0027-directory-structure.md))。生成された HTTP client を
 *   含み、それは本番が使わないもの([0071](docs/adr/0071-bff-api-integration.md))です。一方でモックの
 *   起動そのものは起動境界の仕事であるため、そこからだけ届くようにします
 */
export const RESTRICTED_AREAS = [
  {
    type: "adapters-gen",
    pattern: "src/adapters/gen",
    allowedFrom: ["adapters"],
    allowedFromCategories: [],
  },
  { type: "mocks", pattern: "mocks", allowedFrom: [], allowedFromCategories: ["bootstrap"] },
] as const satisfies readonly {
  type: string;
  pattern: string;
  allowedFrom: readonly Kernel[];
  allowedFromCategories: readonly string[];
}[];
