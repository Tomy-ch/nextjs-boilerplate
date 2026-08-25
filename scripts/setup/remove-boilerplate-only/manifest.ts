// 剥がす対象の宣言。ここはデータだけを持ち、剥がし方は index.ts が担う。

/**
 * マーカーの名前。`boilerplate-only:begin` / `:end` / `:line` / `:replace-*` を作る。
 *
 * @remarks
 * `sample` 族と同じ名前にはできません。族を分ける理由は
 * [0152](../../../docs/adr/0152-agents-md-policy.md) が持ちます。
 */
export const BOILERPLATE_ONLY_MARKER = "boilerplate-only";

/**
 * 剥がし終えたあとに自分を消す対象（リポジトリルート相対）。
 *
 * @remarks
 * サンプル破棄（`scripts/setup/remove-sample/`）へ相乗りさせず、**独立に**消える必要があります。
 * 独立させる理由は [0152](../../../docs/adr/0152-agents-md-policy.md) が持ちます。
 *
 * 剥がしを検証する CI（`.github/workflows/strip-verify.yaml`）も対象です。検証する相手が消えた
 * あとに残すと、fork のすべての PR で「道具が無い」失敗を出し続けます。
 *
 * 共有機構（`scripts/setup/lib/markers.ts`）は消しません。あちらはサンプル破棄も使い、破棄は
 * この後に走りうるからです。
 */
export const SELF_DESTRUCT_PATHS: readonly string[] = [
  "scripts/setup/remove-boilerplate-only",
  ".github/workflows/strip-verify.yaml",
  // このリポジトリの運用にだけ置く検査。呼ぶ API が無料なのは public のときだけで、private では
  // Code Security のライセンスを要求する。既定として配ると、テンプレートから作ったリポジトリは
  // 「金が掛かる」か「コードでは直せない赤」かのどちらかを受け取る。
  // ファイルまるごと消すものはマーカーを持てない（消える側に印を書くことになる）ため、ここで宣言する。
  ".github/workflows/dependency-review.yaml",
  // 解析先がこのリポジトリの SonarCloud organization に紐づく検査。projectKey も
  // organization もここの名前なので、そのまま渡ると fork では死んだ設定になる。SONAR_TOKEN が
  // 無い間は赤くならない作りだが、赤くならないことと持っている意味があることは別である。
  ".github/workflows/sonarcloud.yaml",
  "sonar-project.properties",
];

/**
 * 走査から外すディレクトリ名。
 *
 * @remarks
 * 依存の取得物と VCS の内部、および生成物です。除去しても再生成で戻るものへ書き込むと、次の
 * 生成で消えるうえ drift ゲートが落ちます。
 */
export const EXCLUDED_DIRECTORIES: Set<string> = new Set([
  ".git",
  "node_modules",
  ".next",
  "coverage",
  "dist",
  "storybook-static",
  "tmp",
]);

/** マーカーを持てないファイルの拡張子。 */
export const BINARY_EXTENSIONS: readonly string[] = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".svg",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".pdf",
  ".zip",
];

/** action pin のロックファイル（リポジトリルート相対）。 */
export const ACTIONS_PIN_LOCK_FILE = ".github/actions-pin.toml";
