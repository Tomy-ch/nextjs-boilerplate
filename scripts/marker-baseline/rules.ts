// マーカー行の分布を固定するための判定。走査は scan.ts、ここは値を見て答えるところだけを持つ。
//
// 何のためにこれが在るか（発火するマーカーと規約の例示が同じ形をしていること、例示だと宣言し
// 忘れると閉じたペアが黙って消えること）は [../README.md](../README.md) の「撤去マーカーを足したら
// 数え直す」が持つ。
//
// 数えるのが**行**であって中身でないのは、マーカーを足した / 消した瞬間にしか行数が動かないから
// である。区間の中の散文を直しても差分は出ない。

/**
 * 撤去マーカーの行。両方の族の全接尾辞を 1 本で見る。
 *
 * @remarks
 * 族の名前をここへ直接書くのは、宣言を持つ 2 つのマニフェスト（`remove-sample` /
 * `remove-boilerplate-only`）がどちらも撤去と一緒に自消滅するからです。import で引くと、
 * 先に消えたほうと一緒にこの判定も壊れます。
 *
 * コメント記号を必須にします。付けないと、`sample:begin` をコード片として含む散文まで数え、
 * 文章を直すたびに差分が揺れます。
 */
const MARKER_LINE =
  /(?:\/\/|#|<!--)\s*(?:sample|boilerplate-only):(?:begin|end|line|replace-begin|replace-with|replace-end)\b/;

/** 走査から外すディレクトリ名。依存の取得物と VCS の内部、および生成物。 */
export const EXCLUDED_DIRECTORIES: ReadonlySet<string> = new Set([
  ".git",
  "node_modules",
  ".next",
  "blob-report",
  "coverage",
  "coverage-scripts",
  "dist",
  "storybook-static",
]);

/**
 * 走査から外す相対パス接頭辞。
 *
 * @remarks
 * 並ぶのは**このリポジトリのソースではない領域**だけです —— ツールの生成物、作業用の置き場、
 * 別ブランチの作業ツリー、別リポジトリである基準画像の置き場。載せても再生成で戻るか、そもそも
 * 手元にそれを持つ人だけ差分が出ます。
 *
 * この判定自身のディレクトリを外すのは、宣言とテストがマーカーの形を**入力**として持つためです
 * —— 外さないと、自分を数えて自分と食い違います。
 */
export const EXCLUDED_PATH_PREFIXES: readonly string[] = [
  ".claude/worktrees/",
  ".storybook/public/",
  "baseline/images/",
  "docs/portal/guides/",
  "graphify-out/",
  "out/",
  "scripts/marker-baseline/",
  "src/app/generated/",
  "src/model/generated/",
  "tmp/",
];

/** ファイルごとのマーカー行数。値が 0 の項目は持たない（持つと「無い」の表現が 2 通りになる）。 */
export type Baseline = Readonly<Record<string, number>>;

/** 走査対象か。ディレクトリ名の除外は列挙側が行うため、ここは接頭辞だけを見る。 */
export function isBaselineTarget(relativePath: string): boolean {
  const normalized = relativePath.replaceAll("\\", "/");

  return !EXCLUDED_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function countMarkerLines(content: string): number {
  return content.split("\n").filter((line) => MARKER_LINE.test(line)).length;
}

/**
 * 実際とベースラインの食い違い。人が読んで判断できる文にする。
 *
 * @remarks
 * 増えた側だけでなく減った側も出します。マーカーが移動・削除されたのにベースラインが古いままだと、
 * 次に増えたときの基準がずれ、検査は在るのに何も守っていない状態になります。
 */
export function diffBaseline(actual: Baseline, expected: Baseline): string[] {
  const failures: string[] = [];

  for (const [file, count] of Object.entries(actual)) {
    const before = expected[file];

    if (before === undefined) {
      failures.push(
        `マーカー行が現れました: ${file}（${count} 行）` +
          " — 本物のマーカーならベースラインへ、規約の例示なら除去側のリテラル宣言へ",
      );
      continue;
    }
    if (before !== count) {
      failures.push(`マーカー行数が変わりました: ${file}（${before} → ${count} 行）`);
    }
  }

  for (const file of Object.keys(expected)) {
    if (actual[file] === undefined) {
      failures.push(`マーカー行が無くなりました: ${file} — ベースラインのほうが古い`);
    }
  }

  return failures.sort();
}
