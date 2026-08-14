// 絵を決める入力を 1 つのハッシュに畳む。
//
// 基準画像を撮った時点のハッシュは置き場が持ち、`make vrt` は撮る前に現在の値と突き合わせる。
// 一致していれば、撮っても前と同じ絵にしかならない。
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

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
  // フォントのラスタライズを決めるイメージの digest。
  "docker-compose.dev-tools.yml",
] as const;

/** 入力から外すもの。 */
function isInput(relative: string): boolean {
  // build のたびに変わる metadata。中身は telemetry 用で、描画には関わらない。
  if (relative === "storybook-static/project.json") return false;
  // 基準画像そのもの。入力ではなく、この入力から作られた出力。
  if (relative.startsWith("vrt/screenshots/")) return false;
  // vrt 配下の散文と、実行されないテスト。
  if (relative.startsWith("vrt/") && !relative.endsWith(".ts")) return false;

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
  return RENDER_INPUTS.flatMap((entry) => walk(root, entry))
    .filter(isInput)
    .sort();
}

/** 列挙したファイルのパスと中身から 1 つのハッシュを作る。 */
export function renderInputsHash(root: string, files: readonly string[]): string {
  const digest = createHash("sha256");
  for (const file of files) {
    digest.update(file);
    digest.update(readFileSync(path.join(root, file)));
  }

  return digest.digest("hex");
}

/**
 * 記録された値と現在の値から、比較を省いてよいかを決める。
 *
 * @remarks
 * 記録が無いときは省きません。判定できないことを「変わっていない」と読むと、絵が変わった
 * まま緑で通ります。
 */
export function decideGate(recorded: string | null, current: string): "skip" | "run" {
  return recorded !== null && recorded.trim() === current ? "skip" : "run";
}

function walk(root: string, entry: string): string[] {
  const absolute = path.join(root, entry);
  if (!statSync(absolute).isDirectory()) return [entry];

  return readdirSync(absolute, { recursive: true })
    .map((found) => path.join(entry, found.toString()))
    .filter((relative) => statSync(path.join(root, relative)).isFile());
}
