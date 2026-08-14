import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { listFilesRecursive, readUtf8File, toRelativePath } from "../lib/file-utils";
import { stripMarkers } from "../lib/markers";
import { ROOT_DIR } from "../lib/runtime";
import {
  BINARY_EXTENSIONS,
  BOILERPLATE_ONLY_MARKER,
  EXCLUDED_DIRECTORIES,
  SELF_DESTRUCT_PATHS,
} from "./manifest";

const exists = (relativePath: string): boolean => fs.existsSync(path.join(ROOT_DIR, relativePath));

/** 剥がしが走査するのと同じ範囲のファイル（リポジトリルート相対）。 */
function scanTargets(): string[] {
  return listFilesRecursive(ROOT_DIR, { excludedDirectories: EXCLUDED_DIRECTORIES })
    .map((filePath) => toRelativePath(filePath).split(path.sep).join("/"))
    .filter((relativePath) => !BINARY_EXTENSIONS.some((ext) => relativePath.endsWith(ext)));
}

describe("SELF_DESTRUCT_PATHS", () => {
  // ----- 正常系 -----
  it("宣言したパスがすべて実在する", () => {
    expect(SELF_DESTRUCT_PATHS.filter((target) => !exists(target))).toEqual([]);
  });

  it("剥がしの道具自身を含む", () => {
    expect(SELF_DESTRUCT_PATHS).toContain("scripts/setup/remove-boilerplate-only");
  });

  it("共有機構は消さない", () => {
    const shared = "scripts/setup/lib/markers.ts";

    expect(SELF_DESTRUCT_PATHS.some((target) => shared.startsWith(target))).toBe(false);
  });
});

describe("BOILERPLATE_ONLY_MARKER", () => {
  // ----- 正常系 -----
  // サンプル側の定数を import せず literal で持つ。`remove-sample/` はサンプル破棄で消えるため、
  // 破棄を先に走らせた fork でこのテストが解決不能な import で落ちる。
  it("サンプル破棄とは別の族を指す", () => {
    expect(BOILERPLATE_ONLY_MARKER).not.toBe("sample");
  });

  it("リポジトリ全体でマーカーの対応が取れている", () => {
    const broken = scanTargets().filter((relativePath) => {
      const content = readUtf8File(path.join(ROOT_DIR, relativePath));

      if (content === null) {
        return false;
      }

      try {
        stripMarkers(content, BOILERPLATE_ONLY_MARKER);

        return false;
      } catch {
        return true;
      }
    });

    expect(broken).toEqual([]);
  });
});
