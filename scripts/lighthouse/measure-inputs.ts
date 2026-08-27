// 数値を決める入力を 1 つのハッシュに畳む。
//
// 前に予算を通った時点の値と突き合わせ、一致していれば測っても同じ数にしかならない。
// 畳み方そのものは `scripts/lib/input-hash.ts` が持つ。
//
// **絵を決める入力（`scripts/vrt/render-hash.ts`）とは別の集合である。** あちらが数える
// `storybook-static` はここでは測る対象ではなく、こちらが数える `public` や `env` は絵を
// 変えない。同じ一覧を共有すると、片方に要らない変更のたびにもう片方が走る。
import { collectInputs, inputsHash } from "../lib/input-hash.js";

/**
 * 数値を決める入力（リポジトリルート相対）。
 *
 * @remarks
 * ここに挙げていないものは「測り直しの要否に影響しない」という宣言です。挙げ漏らすと、数が
 * 変わっているのに測定を省く方向へ倒れるため、疑わしいものは挙げます。
 *
 * **build 生成物ではなく元を数えます。** 判定は build より前の段（`plan`）で要る一方、`.next`
 * はそこにまだ無いためです。生成物は元と依存と設定から決まるので、その 3 つを挙げれば足ります。
 */
const MEASURE_INPUTS = [
  // 測る対象そのもの。
  "src",
  // 配信する資材。画像の大きさは LCP に直接効く。
  "public",
  // 画面が描く中身。件数が変われば DOM の量が変わる。
  "mocks",
  // 測る画面の宣言と、役割の要る画面を開くための session。
  "e2e/lib",
  // 測り方（起動・待ち方・回数・分割）。
  "scripts/lighthouse",
  // 照らす上限。
  "performance-budget.yaml",
  // build の設定。
  "next.config.ts",
  "postcss.config.mjs",
  "tsconfig.json",
  // 配色と字の生成物。CSS の量に効く。
  "tokens",
  // 実行時の設定。固定した時計は要求の URL を決め、モックの応答を決める。
  "env",
  // build を回す Node の版。
  "mise.toml",
  // 依存と、測るブラウザの版。どちらも数を動かす。
  "pnpm-lock.yaml",
] as const;

/** 入力から外すもの。 */
function isInput(relative: string): boolean {
  // 散文。直しても数は動かない。
  if (relative.endsWith(".md")) return false;
  // アプリの build に入らないもの。story は Storybook だけが読み、テストは実行されない。
  if (/\.stories\.tsx?$/.test(relative)) return false;

  return !/\.test\.tsx?$/.test(relative);
}

/** 数値を決める入力に当たるファイルをリポジトリルート相対で列挙する。 */
export function collectMeasureInputs(root: string): string[] {
  return collectInputs(root, MEASURE_INPUTS, isInput);
}

/** 列挙したファイルのパスと中身から 1 つのハッシュを作る。 */
export function measureInputsHash(root: string, files: readonly string[]): string {
  return inputsHash(root, files);
}
