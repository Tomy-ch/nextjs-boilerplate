import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ROOT_DIR } from "../lib/runtime";
import { assertWithinRoot, findRedundantPaths } from "./plan";
import {
  BINARY_EXTENSIONS,
  EXCLUDED_PATH_PREFIXES,
  MARKER_LITERAL_FILES,
  SAMPLE_MARKER,
  SAMPLE_PATHS,
} from "./sample-manifest";

const exists = (relativePath: string): boolean => fs.existsSync(path.join(ROOT_DIR, relativePath));

describe("SAMPLE_PATHS", () => {
  // ----- 正常系 -----
  it("宣言したパスがすべて実在する", () => {
    expect(SAMPLE_PATHS.filter((target) => !exists(target))).toEqual([]);
  });

  it("すべてリポジトリの内側を指す", () => {
    expect(() => {
      for (const target of SAMPLE_PATHS) {
        assertWithinRoot(target, ROOT_DIR);
      }
    }).not.toThrow();
  });

  it("他の対象に含まれる宣言を持たない", () => {
    expect(findRedundantPaths(SAMPLE_PATHS)).toEqual([]);
  });

  it("破棄の道具自身を含む", () => {
    expect(SAMPLE_PATHS).toContain("scripts/setup/remove-sample");
  });
});

describe("MARKER_LITERAL_FILES", () => {
  // ----- 正常系 -----
  it("宣言したファイルがすべて実在する", () => {
    expect(MARKER_LITERAL_FILES.filter((target) => !exists(target))).toEqual([]);
  });

  it("マーカーの形を実際に含む", () => {
    const withoutMarker = MARKER_LITERAL_FILES.filter(
      (target) =>
        !fs.readFileSync(path.join(ROOT_DIR, target), "utf8").includes(`${SAMPLE_MARKER}:`),
    );

    expect(withoutMarker).toEqual([]);
  });
});

describe("EXCLUDED_PATH_PREFIXES", () => {
  // ----- 正常系 -----
  it("すべて区切りで終わる", () => {
    expect(EXCLUDED_PATH_PREFIXES.filter((prefix) => !prefix.endsWith("/"))).toEqual([]);
  });
});

describe("BINARY_EXTENSIONS", () => {
  // ----- 正常系 -----
  it("すべてドットで始まり小文字である", () => {
    expect(
      BINARY_EXTENSIONS.filter(
        (extension) => !extension.startsWith(".") || extension !== extension.toLowerCase(),
      ),
    ).toEqual([]);
  });
});
