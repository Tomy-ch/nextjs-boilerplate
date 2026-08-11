import { describe, expect, it } from "vitest";

import { countWorktrees } from "./worktree-count";

const PORCELAIN = `worktree /repo
HEAD abc123
branch refs/heads/release/v0.5.0

worktree /repo/.claude/worktrees/issue-151
HEAD def456
branch refs/heads/feature/151-load-band
`;

describe("countWorktrees", () => {
  // ----- 正常系 -----
  it("レコードの先頭行を数える", () => {
    expect(countWorktrees(PORCELAIN)).toBe(2);
  });

  it("作業ツリーが 1 件だけでも数える", () => {
    expect(countWorktrees("worktree /repo\nHEAD abc123\n")).toBe(1);
  });

  it("detached な作業ツリーも数える", () => {
    expect(countWorktrees("worktree /repo\nHEAD abc123\ndetached\n")).toBe(1);
  });

  // ----- 異常系 -----
  it("出力が空なら、数えられなかったものとして null を返す", () => {
    expect(countWorktrees("")).toBeNull();
  });

  it("`worktree` の行が無ければ null を返す", () => {
    expect(countWorktrees("HEAD abc123\nbranch refs/heads/main\n")).toBeNull();
  });

  it("パスを伴わない `worktree` の行は数えない", () => {
    expect(countWorktrees("worktree\nworktree   \n")).toBeNull();
  });
});
