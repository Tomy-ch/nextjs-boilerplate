/**
 * `git worktree list --porcelain` の出力に現れる作業ツリーの数を返す。
 *
 * @returns 1 件以上あればその数。1 件も読めなければ `null`。呼び出し元自身の作業ツリーは必ず
 *   現れるため、0 件は「数えられなかった」と同義になる。
 */
export function countWorktrees(porcelainOutput: string): number | null {
  const count = porcelainOutput.split("\n").filter((line) => /^worktree\s+\S/.test(line)).length;

  return count === 0 ? null : count;
}
