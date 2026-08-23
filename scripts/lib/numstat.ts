// `git diff --numstat` の読み取り。差分の量を見る判定が複数あるため、読み方は 1 つに揃える。

/** 変更されたファイル 1 件。 */
export type Change = {
  /** リポジトリルート相対のパス。 */
  readonly path: string;
  /** 増えた行と減った行の合計。 */
  readonly changedLines: number;
};

/**
 * `git diff --numstat` の出力を読む。
 *
 * @remarks
 * 二進ファイルの行は行数の代わりに `-` を持ちます。行では表せないので 0 として数えます ——
 * 画像を差し替えた差分は、描画に効いても行数に現れません。
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
