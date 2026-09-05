// リポジトリを走査してマーカー行の分布を作る。判定は rules.ts、ここはファイル読みだけを担う。

import fs from "node:fs";
import path from "node:path";

import {
  type Baseline,
  EXCLUDED_DIRECTORIES,
  countMarkerLines,
  isBaselineTarget,
} from "./rules.js";

/** リポジトリのルート。 */
export const REPO_ROOT = path.resolve(import.meta.dirname, "../..");

/** コミット済みのベースラインの置き場。 */
export const BASELINE_PATH = path.join(REPO_ROOT, "scripts/marker-baseline/baseline.json");

/**
 * 走査するファイルをルート相対で集める。
 *
 * @remarks
 * 除外はディレクトリを降りる前に当てます。降りてからファイルを捨てる作りにすると、別ブランチの
 * 作業ツリー（`.claude/worktrees/`）を丸ごと歩くことになります。接頭辞の宣言がすべて区切りで
 * 終わることは `rules.test.ts` が見ており、それが「ファイル側で当て直さなくてよい」の根拠です。
 *
 * シンボリックリンクは辿りません。この木の外を指すものなので、辿るとリポジトリの外側の行数が
 * ベースラインに載ります。
 */
function walk(root: string, dir: string, found: string[]): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    const relative = path.relative(root, absolute).split(path.sep).join("/");

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRECTORIES.has(entry.name)) continue;
      if (!isBaselineTarget(`${relative}/`)) continue;

      walk(root, absolute, found);
      continue;
    }
    if (entry.isFile()) found.push(relative);
  }

  return found;
}

/**
 * 木のマーカー行分布。キーは相対パスの昇順で、マーカーを持たないファイルは載せない。
 *
 * @remarks
 * 並びは**コード単位の順**で、環境によって変わりません。ロケール依存の比較で並べると、同じ木を
 * 別のロケールで走査したときに順序が変わり、中身と無関係な差分がベースラインに出ます。
 *
 * 読めないファイルを握り潰しません。読めなければマーカー行数は**不明**であり、飛ばすことは
 * 「0 行」と記録するのと同じです。0 として載れば、そこへ後からマーカーが増えても差分に出ません
 * —— この検査が塞ごうとしている無言の見落としと、同じ形の穴になります。
 */
export function scanTree(root: string): Baseline {
  const found: Array<[string, number]> = [];

  // 並べてから読む。`Object.fromEntries` は差し込んだ順を保つので、ここが出力の順になる。
  for (const relative of walk(root, root, []).sort((a, b) => (a < b ? -1 : 1))) {
    const count = countMarkerLines(fs.readFileSync(path.join(root, relative), "utf8"));

    if (count > 0) found.push([relative, count]);
  }

  return Object.fromEntries(found);
}

/** コミット済みのベースライン。 */
export function readBaseline(): Baseline {
  return JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")) as Baseline;
}
