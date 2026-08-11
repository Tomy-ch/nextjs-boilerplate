/**
 * `git worktree list --porcelain` の出力から作業ツリーの数を読む。
 *
 * @remarks
 * `git worktree list | grep -c .` のような数え方を採らないのは、git が答えられないときに
 * `0` と `1` の両方を出しうるためです。呼び出し側の比較が壊れ、帯が黙って `full` へ劣化します。
 * ここは「数えられなかった」を `null` として返し、劣化させるかどうかの判断を呼び出し側へ渡します。
 *
 * porcelain 形式を読むのは、1 レコードが `worktree <path>` で始まり空行で区切られると
 * 決まっているためです。人間向けの出力は列の幅で揺れます。
 */

/**
 * porcelain 出力に現れる作業ツリーの数を返す。
 *
 * @returns 1 件以上あればその数。1 件も読めなければ `null`（少なくとも自分自身は必ず現れるため、
 *   0 件は「数えられなかった」と同義）。
 */
export function countWorktrees(porcelainOutput: string): number | null {
  const count = porcelainOutput.split("\n").filter((line) => /^worktree\s+\S/.test(line)).length;

  return count === 0 ? null : count;
}
