/**
 * 層構造の宣言。依存マトリクスの単一の正であり、ESLint の境界検査（`eslint.config.ts`）と
 * 層 README の frontmatter 突合（`scripts/architecture/`）の双方がここを読む。
 *
 * @remarks
 * 宣言と強制を別々に書くと、片方だけを直したコミットが何にも咎められずに通ります。マトリクスの
 * 表現をこの 1 ファイルに閉じ、強制側は生成でも複製でもなく直接の import で受け取ります。
 *
 * 責務そのものは ADR で決まります。ここが持つのは強制へ変換できる構造だけで、各層が何を担うかは
 * [0021](docs/adr/0021-frontend-responsibility.md) が正です。
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
 * UI を置いてよい層。
 *
 * @remarks
 * [0021](docs/adr/0021-frontend-responsibility.md) の層別責務表は、`adapters` / `capabilities` /
 * `stores` / `config` の禁止事項に UI を挙げています。ここに無い層で描画を組み立てると、外部接続や
 * 横断状態の内側に画面が生まれ、置き場を辿れなくなります。
 *
 * 強制が届くのは **DOM マークアップだけ**です。Provider の合成は
 * [0022](docs/adr/0022-capabilities-kernel.md) / [0026](docs/adr/0026-layout-shell-mount.md) が
 * 明示的に許しており、React 19 では Provider も JSX なので、JSX の有無では分けられません。層に
 * class 名や見た目の定数を置く経路も残るため、これは「UI 禁止」の全部ではなく、機械で読める部分です。
 */
export const UI_KERNELS = ["app", "features", "components"] as const satisfies readonly Kernel[];

/**
 * 層ごとに import を許す層。ここに無い組み合わせはすべて禁止される。
 *
 * @remarks
 * 依存は内向きの一方向です。`app` が最も外側で、`errors` / `logging` / `observability` /
 * `config` は他の層を参照しない末端に置きます。`features` が `features` を含まないのは、
 * 機能スライス同士の相互参照を禁じているためです。唯一の抜け道は {@link SHARED_AREAS} の
 * `features-facade` で、層の粒度ではなく区画の粒度で許します。
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
 * 層を検査の要素へ切り出すときの経路。既定は `src/<kernel>` を 1 つの要素として扱う。
 *
 * @remarks
 * 境界検査は**要素の間**しか見ません。同じ要素の中の import は、依存表に載っていなくても
 * 「内部の参照」として通ります。層をディレクトリ 1 つに対応させると、`features` は
 * 全スライスがまとめて 1 要素になり、feature 同士の直接 import が内部の参照として黙って
 * 通ります。スライスごとに要素を切って、初めて依存表の禁止が効きます。
 */
export const KERNEL_PATTERNS: Partial<Readonly<Record<Kernel, string>>> = {
  features: "src/features/*",
};

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
  {
    // 画面の合成を見せる story。合成は `app` 層の管轄だが、`app` に story は置けない
    // ([0027](docs/adr/0027-directory-structure.md) の route segment は薄い層)。そのため
    // feature 配下の story にだけ、`app` と同じく feature を跨いで組む権限を与える。
    // 対象は story ファイルのみで、実装は `features` の層として検査されたままになる。
    category: "feature-story",
    pattern: "src/features/**/*.stories.tsx",
    dependencies: ["features", "components", "model", "stores", "capabilities", "errors"],
  },
] as const satisfies readonly {
  category: string;
  pattern: string;
  dependencies: readonly Kernel[];
}[];

/**
 * 層の内側にありながら、外の層から import してよい区画。
 *
 * @remarks
 * {@link RESTRICTED_AREAS} と向きが逆です。あちらは層の許可より狭め、ここは層の禁止より広げます。
 *
 * - `features-facade`: feature が他の feature へ見せる唯一の面（[0021](docs/adr/0021-frontend-responsibility.md)
 *   「昇格できないもの」）。`features` 同士の import は禁じたまま、この区画だけを通します。
 *   区画自身が import できるものは `features` と同じで、**`features` を含みません**。facade が
 *   feature の内部を参照できると、内部が facade 経由で外へ素通しになり、面を分けた意味が消えます。
 *   **区画同士も許しません。** 同じ feature の中は 1 つの要素なので宣言なしで通り、宣言を足すと
 *   別の feature の面まで通ってしまいます
 */
export const SHARED_AREAS = [
  {
    type: "features-facade",
    pattern: "src/features/*/facade",
    allowedFrom: ["app", "features"],
    allowedFromCategories: ["feature-story"],
    dependencies: DEPENDENCIES.features,
  },
] as const satisfies readonly {
  type: string;
  pattern: string;
  allowedFrom: readonly Kernel[];
  allowedFromCategories: readonly string[];
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
