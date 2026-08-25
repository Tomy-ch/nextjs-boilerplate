// `git diff --numstat` の読み取り。差分の量を見る判定が複数あるため、読み方は 1 つに揃える。

/** 変更されたファイル 1 件。 */
export type Change = {
  /** リポジトリルート相対のパス。 */
  readonly path: string;
  /** 増えた行と減った行の合計。 */
  readonly changedLines: number;
};

/**
 * `git diff` に渡す引数。呼ぶ側は比較する範囲だけを足す。
 *
 * @remarks
 * **`core.quotePath` を切るのがこの関数の存在理由です。**git は既定で ASCII を外れるパスを
 * 二重引用符と 8 進エスケープで包むため（`"src/\346\227\245..."`）、そのまま読むと引用符から
 * 始まる別の文字列になります。読む側は接頭辞でパスを選ぶので、**その差分が黙って数から落ちます**
 * —— 落ちる向きは「検査しない」側で、しかも 0 件は「対象なし」と見分けが付きません。
 *
 * 引数をここが持つのは、切る責務を読む側と同じ場所に置くためです。呼ぶ側で足す形にすると、
 * 次に足された 3 つ目の呼び出しだけが忘れる形で戻ってきます。
 *
 * @param range - 比較する範囲。`["origin/main...HEAD"]` や `["origin/main", "HEAD"]`
 */
export function numstatArgs(range: readonly string[]): string[] {
  return ["-c", "core.quotePath=false", "diff", "--numstat", ...range];
}

/**
 * `git diff --numstat` の出力を読む。
 *
 * @remarks
 * 二進ファイルの行は行数の代わりに `-` を持ちます。行では表せないので 0 として数えます ——
 * 画像を差し替えた差分は、描画に効いても行数に現れません。
 *
 * 列がちょうど 3 つでない行は落とします。多い側も落とすのは、パスに tab を含むファイルが
 * 分解できず、拾えば壊れた形のまま下流の合計へ混ざるためです。
 *
 * 渡す出力は {@link numstatArgs} で取ったものであること。引用符を解く処理はここに**ありません**。
 */
export function parseNumstat(text: string): Change[] {
  return text
    .split("\n")
    .map((line) => line.split("\t"))
    .filter((columns): columns is [string, string, string] => columns.length === 3)
    .map(([added, removed, path]) => ({
      path,
      changedLines: Number.parseInt(added, 10) + Number.parseInt(removed, 10) || 0,
    }));
}
