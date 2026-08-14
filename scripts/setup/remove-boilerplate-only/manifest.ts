// 剥がす対象の宣言。ここはデータだけを持ち、剥がし方は index.ts が担う。

/**
 * マーカーの名前。`boilerplate-only:begin` / `:end` / `:line` / `:replace-*` を作る。
 *
 * @remarks
 * `sample` 族と別の名前にしてあるのは、消える契機が違うためです。サンプルは「題材を使うか」で
 * 選べる任意の破棄ですが、boilerplate 限定の散文は**fork を作った時点で前提が失効する**ので、
 * 選択の余地がありません。同じ名前にすると、サンプルを残す fork が両方を残してしまいます。
 */
export const BOILERPLATE_ONLY_MARKER = "boilerplate-only";

/**
 * 剥がし終えたあとに自分を消す対象（リポジトリルート相対）。
 *
 * @remarks
 * この道具自身が boilerplate 限定です。fork では二度と走らないので、残すと「実行してよいのか」の
 * 判断を fork 先へ負わせます。サンプル破棄（`scripts/setup/remove-sample/`）とは**独立に**消える
 * 必要があります。サンプルを残す fork は破棄の手順を飛ばすため、あちらへ相乗りさせると剥がしの
 * 道具だけが残るためです。
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
