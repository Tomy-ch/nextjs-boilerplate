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
export const EXCLUDE_DIRS: ReadonlySet<string> = new Set(["node_modules", ".git"]);

/**
 * ルートからの相対パスの先頭一致で外すもの。
 *
 * @remarks
 * **この走査は `.gitignore` を見ません。** 並ぶのはすべて gitignore 済みの生成物で、外さないと
 * それを生成した人だけ手元の成果物で pre-commit が落ちます。
 */
export const EXCLUDE_PREFIXES: readonly string[] = [
  path.join(".claude", "worktrees"),
  "graphify-out",
  // カタログの build が `.storybook/README.md` を写し込むため、リンクが 1 段ずれた写しが入る。
  "storybook-static",
  "tmp",
  "dist",
  path.join("docs", "portal", "guides"),
];

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

      if (entry.name.endsWith(".md")) {
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
 *
 * **公開しているのは、両向きを固定できるようにするためです。** 走査が積む順は OS と
 * ファイルシステムが決めるので、`collectMarkdownFiles` 経由では「後の方が先に来る」組を
 * 意図して作れず、向きが反転しても実行環境によっては落ちません。
 */
export function byCodeUnit(left: string, right: string): number {
  return left < right ? -1 : 1;
}
