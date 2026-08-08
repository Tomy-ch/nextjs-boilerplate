import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { collectActionDefinitions, readDirOrEmpty } from "./composite-action-files";

let workspace: string;

/** `<workspace>/<path>` へ親ディレクトリごとファイルを置く。 */
function place(path: string, content = ""): void {
  const target = join(workspace, path);
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(target, content);
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "composite-action-files-"));
});

afterEach(() => {
  rmSync(workspace, { force: true, recursive: true });
});

describe("collectActionDefinitions", () => {
  // ----- 正常系 -----
  it("action.yml と action.yaml の双方を集める", () => {
    place("setup/action.yml");
    place("notify/action.yaml");
    const found: string[] = [];

    collectActionDefinitions(workspace, found);

    expect(found.sort()).toEqual(
      [join(workspace, "notify", "action.yaml"), join(workspace, "setup", "action.yml")].sort(),
    );
  });

  it("入れ子に置かれた定義まで再帰して集める", () => {
    place("group/nested/action.yml");
    const found: string[] = [];

    collectActionDefinitions(workspace, found);

    expect(found).toEqual([join(workspace, "group", "nested", "action.yml")]);
  });

  it("渡された配列へ追記する", () => {
    place("setup/action.yml");
    const found = ["既存"];

    collectActionDefinitions(workspace, found);

    expect(found).toHaveLength(2);
    expect(found[0]).toBe("既存");
  });

  // ----- 異常系 -----
  it("定義ファイル名でない YAML を集めない", () => {
    place("setup/config.yml");
    const found: string[] = [];

    collectActionDefinitions(workspace, found);

    expect(found).toEqual([]);
  });

  it("ディレクトリが無ければ何も集めない", () => {
    const found: string[] = [];

    collectActionDefinitions(join(workspace, "不在"), found);

    expect(found).toEqual([]);
  });
});

describe("readDirOrEmpty", () => {
  // ----- 正常系 -----
  it("ディレクトリ項目を Dirent として返す", () => {
    place("setup/action.yml");

    expect(readDirOrEmpty(workspace).map((entry) => entry.name)).toEqual(["setup"]);
  });

  // ----- 異常系 -----
  it("ディレクトリが無ければ空を返す", () => {
    expect(readDirOrEmpty(join(workspace, "不在"))).toEqual([]);
  });

  it("ディレクトリでない対象の読み取り失敗は投げ直す", () => {
    place("action.yml");

    expect(() => readDirOrEmpty(join(workspace, "action.yml"))).toThrow();
  });
});
