import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { collectCommentActions, localActionDir, UPSERT_ACTION_DIR } from "./comment-actions";

let root: string;

/** `<root>/.github/actions/<name>/action.yml` を置く。 */
function placeAction(name: string, body: string): void {
  const dir = join(root, ".github", "actions", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "action.yml"), body);
}

const readFile = (absolute: string): string => readFileSync(absolute, "utf8");

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "comment-actions-"));
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe("localActionDir", () => {
  // ----- 正常系 -----
  it("ローカル参照をディレクトリの相対パスへ正規化する", () => {
    expect(localActionDir("./.github/actions/upsert-pr-comment")).toBe(UPSERT_ACTION_DIR);
  });

  it("前後の空白と末尾のスラッシュを落とす", () => {
    expect(localActionDir("  ./.github/actions/setup//  ")).toBe(".github/actions/setup");
  });

  it("途中の . と .. を畳む", () => {
    expect(localActionDir("./.github/actions/group/../setup")).toBe(".github/actions/setup");
  });

  // ----- 異常系 -----
  it("リモート action はローカル参照として扱わない", () => {
    expect(localActionDir("actions/checkout@v7")).toBeNull();
  });

  it("docker action はローカル参照として扱わない", () => {
    expect(localActionDir("docker://alpine:3")).toBeNull();
  });
});

describe("collectCommentActions", () => {
  // ----- 正常系 -----
  it("upsert-pr-comment 自身を常に集合へ含める", () => {
    placeAction("upsert-pr-comment", "runs:\n  using: composite\n");

    const actions = collectCommentActions(root, readFile);

    expect(actions.dirs.has(UPSERT_ACTION_DIR)).toBe(true);
    expect(actions.defined).toBe(true);
  });

  it("upsert-pr-comment を直接呼ぶ action を集合へ含める", () => {
    placeAction("upsert-pr-comment", "runs:\n  using: composite\n");
    placeAction(
      "report",
      "runs:\n  using: composite\n  steps:\n    - uses: ./.github/actions/upsert-pr-comment\n",
    );

    expect(collectCommentActions(root, readFile).dirs).toContain(".github/actions/report");
  });

  it("ラッパを何枚挟んでも到達可能な action を集合へ含める", () => {
    placeAction("upsert-pr-comment", "runs:\n  using: composite\n");
    placeAction(
      "inner",
      "runs:\n  using: composite\n  steps:\n    - uses: ./.github/actions/upsert-pr-comment\n",
    );
    placeAction(
      "outer",
      "runs:\n  using: composite\n  steps:\n    - uses: ./.github/actions/inner\n",
    );

    const dirs = collectCommentActions(root, readFile).dirs;

    expect(dirs).toContain(".github/actions/inner");
    expect(dirs).toContain(".github/actions/outer");
  });

  it("参照が循環していても走査を終える", () => {
    placeAction("upsert-pr-comment", "runs:\n  using: composite\n");
    placeAction("a", "runs:\n  using: composite\n  steps:\n    - uses: ./.github/actions/b\n");
    placeAction(
      "b",
      "runs:\n  using: composite\n  steps:\n    - uses: ./.github/actions/a\n    - uses: ./.github/actions/upsert-pr-comment\n",
    );

    const dirs = collectCommentActions(root, readFile).dirs;

    expect(dirs).toContain(".github/actions/a");
    expect(dirs).toContain(".github/actions/b");
  });

  // ----- 異常系 -----
  it("upsert-pr-comment の定義が無ければ defined を false にする", () => {
    placeAction("report", "runs:\n  using: composite\n");

    const actions = collectCommentActions(root, readFile);

    expect(actions.defined).toBe(false);
    expect(actions.dirs).toEqual(new Set([UPSERT_ACTION_DIR]));
  });

  it("composite action ディレクトリが無くても走査できる", () => {
    const actions = collectCommentActions(root, readFile);

    expect(actions.defined).toBe(false);
    expect(actions.dirs).toEqual(new Set([UPSERT_ACTION_DIR]));
  });

  it("到達しない action を集合へ含めない", () => {
    placeAction("upsert-pr-comment", "runs:\n  using: composite\n");
    placeAction(
      "unrelated",
      "runs:\n  using: composite\n  steps:\n    - uses: actions/checkout@v7\n",
    );

    expect(collectCommentActions(root, readFile).dirs).not.toContain(".github/actions/unrelated");
  });
});
