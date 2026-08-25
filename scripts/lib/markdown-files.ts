import fs from "node:fs";
import path from "node:path";

/**
 * 検証対象の Markdown を集める。
 *
 * @remarks
 * 対象範囲は markdownlint-cli2 の `ignores` と揃えます。片方だけが見るファイルがあると、
 * 「markdownlint は通るのに mermaid-lint で落ちる」形の差が出ます。
 */

/** 名前がどこに現れても降りないディレクトリ。 */
const EXCLUDE_DIRS = new Set(["node_modules", ".git"]);

/**
 * ルートからの相対パスの先頭一致で外すもの。
 *
 * @remarks
 * `graphify-out` は gitignore 済みですが、この走査は `.gitignore` を見ません。外さないと
 * グラフを生成した人だけ手元の生成物で pre-commit が落ちます。
 */
const EXCLUDE_PREFIXES: readonly string[] = [path.join(".claude", "worktrees"), "graphify-out"];

/** 完全一致で外すもの。 */
const EXCLUDE_FILES = new Set<string>([]);

/**
 * 除外接頭辞に当たるか。
 *
 * @remarks
 * 境界は区切り文字で見ます。単なる前方一致だと `.claude/worktrees` が
 * `.claude/worktrees-backup` にも当たります。
 */
export function isExcludedPath(relativePath: string): boolean {
  return EXCLUDE_PREFIXES.some(
    (prefix) => relativePath === prefix || relativePath.startsWith(`${prefix}${path.sep}`),
  );
}

/**
 * ルート配下の `*.md` をルート相対パスで、名前順に集める。
 *
 * @remarks
 * 並びは**コード単位の順**で、環境によって変わりません。`localeCompare` を使わないのは、
 * 同じ木を別のロケールで走査したときに順序が変わり、順序に依存する呼び出し側（差分の比較・
 * 報告の並び）が環境ごとに違う結果を出すためです。
 */
export function collectMarkdownFiles(root: string): string[] {
  const found: string[] = [];

  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      const relative = path.relative(root, absolute);

      // 除外はディレクトリの段階で判定する。ファイルまで降りてから捨てると、外したはずの
      // ツリー全体を走査してしまう。
      if (isExcludedPath(relative)) {
        continue;
      }

      if (entry.isDirectory()) {
        if (!EXCLUDE_DIRS.has(entry.name)) {
          walk(absolute);
        }

        continue;
      }

      if (entry.name.endsWith(".md") && !EXCLUDE_FILES.has(relative)) {
        found.push(relative);
      }
    }
  };

  walk(root);

  return found.sort(byCodeUnit);
}

/**
 * コード単位で比べる。ロケールに依らず同じ順序を返す。
 *
 * @remarks
 * 等しい場合を持ちません。走査は 1 つのパスを 2 度出さないので、比較の対象が同じ綴りになる
 * ことがありません。
 */
function byCodeUnit(left: string, right: string): number {
  return left < right ? -1 : 1;
}
