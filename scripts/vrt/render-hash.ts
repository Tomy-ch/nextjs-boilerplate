// 絵を決める入力を 1 つのハッシュに畳む。
//
// 基準画像を撮った時点のハッシュは置き場が持ち、`make vrt` は撮る前に現在の値と突き合わせる。
// 一致していれば、撮っても前と同じ絵にしかならない。
import { collectInputs, inputsHash } from "../lib/input-hash.js";

export { decideGate } from "../lib/input-hash.js";

/**
 * 絵を決める入力(リポジトリルート相対)。
 *
 * @remarks
 * ここに挙げていないものは「撮り直しの要否に影響しない」という宣言です。挙げ漏らすと、絵が
 * 変わっているのに比較を省く方向へ倒れるため、疑わしいものは挙げます。
 */
const RENDER_INPUTS = [
  // 撮る対象そのもの。story・部品・token・CSS はすべてここへ畳まれる。
  "storybook-static",
  // viewport / テーマ / timezone / locale / 比較条件。
  "playwright.config.ts",
  // 撮り方(待ち方・固定する時計・撮影対象の絞り込み)。
  "vrt",
  // 置き場の区画割りと、対応の突き合わせ。画像そのものは出力なので isInput が外す。
  "baseline",
  // フォントのラスタライズを決めるイメージの digest。
  "docker-compose.dev-tools.yml",
  // 検査そのものの実装。コンテナはリポジトリをマウントするだけなので、Playwright と axe は
  // イメージではなく node_modules から来る(docker-compose.dev-tools.yml)。版が動けば、
  // storybook-static が 1 バイトも変わらないまま結果だけが変わりうる。
  "pnpm-lock.yaml",
] as const;

/** ソースだけが入力に当たるディレクトリ。散文を入れると、文書を直すだけで比較が走る。 */
const SOURCE_ONLY_DIRS = ["vrt/", "baseline/"];

/** 入力から外すもの。 */
function isInput(relative: string): boolean {
  // build のたびに変わる metadata。中身は telemetry 用で、描画には関わらない。
  if (relative === "storybook-static/project.json") return false;
  // 基準画像そのもの。入力ではなく、この入力から作られた出力。
  if (relative.startsWith("baseline/images/")) return false;
  // 撮る仕組みを持つディレクトリの散文と、実行されないテスト。
  if (SOURCE_ONLY_DIRS.some((dir) => relative.startsWith(dir)) && !relative.endsWith(".ts")) {
    return false;
  }

  return !/\.test\.tsx?$/.test(relative);
}

/**
 * 入力に当たるファイルをリポジトリルート相対で列挙する。
 *
 * @remarks
 * 入力が 1 つでも見つからなければ例外を投げます。欠けたまま算出すると、別の状態が同じ
 * ハッシュを持ち得ます。
 */
export function collectRenderInputs(root: string): string[] {
  return collectInputs(root, RENDER_INPUTS, isInput);
}

/** 列挙したファイルのパスと中身から 1 つのハッシュを作る。 */
export function renderInputsHash(root: string, files: readonly string[]): string {
  return inputsHash(root, files);
}
