import { describe, expect, it } from "vitest";

import {
  assertPlainArgument,
  parseOnly,
  reviewSlug,
  reviewWorktrees,
  worktreePath,
} from "./worktree";

describe("reviewSlug", () => {
  // ----- 正常系 -----
  it("階層を持つブランチ名を 1 階層の名前へ畳む", () => {
    expect(reviewSlug("feature/276-admin-dashboard")).toBe("feature-276-admin-dashboard");
  });

  it("同じブランチ名は必ず同じ名前へ落ちる", () => {
    expect(reviewSlug("bugfix/1-a")).toBe(reviewSlug("bugfix/1-a"));
  });

  it("先頭と末尾に残る区切りを落とす", () => {
    expect(reviewSlug("/feature/x/")).toBe("feature-x");
  });

  // ----- 異常系 -----
  it("畳んだ結果が空になるブランチ名を弾く", () => {
    expect(() => reviewSlug("///")).toThrow("ディレクトリ名にできない");
  });
});

describe("worktreePath", () => {
  // ----- 正常系 -----
  it("見る対象ごとに別の位置を返す", () => {
    expect(worktreePath("vrt", "feature/x")).toBe("tmp/review/vrt/feature-x");
    expect(worktreePath("e2e", "feature/x")).toBe("tmp/review/e2e/feature-x");
  });
});

describe("reviewWorktrees", () => {
  const porcelain = [
    "worktree /repo",
    "HEAD 1111111111111111111111111111111111111111",
    "branch refs/heads/develop",
    "",
    "worktree /repo/tmp/review/vrt/feature-x",
    "HEAD 2222222222222222222222222222222222222222",
    "detached",
    "",
    "worktree /repo/tmp/review/e2e/feature-x",
    "HEAD 3333333333333333333333333333333333333333",
    "detached",
    "",
  ].join("\n");

  // ----- 正常系 -----
  it("見直しで生やしたものだけを取り出す", () => {
    expect(reviewWorktrees(porcelain, "/repo")).toEqual([
      "/repo/tmp/review/vrt/feature-x",
      "/repo/tmp/review/e2e/feature-x",
    ]);
  });

  it("他の目的で生やした作業ツリーを巻き込まない", () => {
    const other = "worktree /repo/.claude/worktrees/issue-1\ndetached\n";

    expect(reviewWorktrees(other, "/repo")).toEqual([]);
  });

  it("1 件も生やしていなければ空を返す", () => {
    expect(reviewWorktrees("worktree /repo\nbranch refs/heads/develop\n", "/repo")).toEqual([]);
  });
});

describe("assertPlainArgument", () => {
  // ----- 正常系 -----
  it("ふつうのブランチ名を通す", () => {
    expect(() => assertPlainArgument("--branch", "develop")).not.toThrow();
  });

  // ----- 異常系 -----
  it("空の値を弾く", () => {
    expect(() => assertPlainArgument("--branch", "")).toThrow("--branch の値が不正です: (空)");
  });

  it("オプションとして読まれる値を弾く", () => {
    expect(() => assertPlainArgument("--run", "--force")).toThrow("--run の値が不正です: --force");
  });
});

describe("parseOnly", () => {
  // ----- 正常系 -----
  it("カンマ区切りを解き、空白を落とす", () => {
    expect(parseOnly("a, b ,c")).toEqual(["a", "b", "c"]);
  });

  it("重複を最初の 1 つだけ残し、受け取った順序を保つ", () => {
    expect(parseOnly("b,a,b")).toEqual(["b", "a"]);
  });

  it("末尾の区切りだけの要素を落とす", () => {
    expect(parseOnly("a,,b,")).toEqual(["a", "b"]);
  });

  // ----- 異常系 -----
  it("要素を 1 つも持たない指定を弾く", () => {
    expect(() => parseOnly(" , ")).toThrow("見る対象が空です");
  });
});
