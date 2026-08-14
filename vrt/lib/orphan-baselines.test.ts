import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  expectedBaselines,
  listBaselines,
  missingBaselines,
  orphanBaselines,
} from "./orphan-baselines";
import type { Story } from "./story-index";

let root: string;

/** 置き場へ空のファイルを置く。途中のディレクトリも作る。 */
function place(relative: string): void {
  const file = join(root, relative);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, "");
}

const story = (id: string, group: string): Story => ({ id, group, title: group, name: id });

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "orphan-baselines-"));
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe("expectedBaselines", () => {
  // ----- 正常系 -----
  it("系統 / テーマ / id の 3 区画で組み立てる", () => {
    expect(expectedBaselines([story("action-button--default", "action")])).toEqual([
      "action/dark/action-button--default.png",
      "action/light/action-button--default.png",
    ]);
  });

  it("撮る配色テーマの数だけ 1 つの story を数える", () => {
    expect(expectedBaselines([story("a--x", "action")])).toHaveLength(2);
  });

  it("撮影対象が空なら空を返す", () => {
    expect(expectedBaselines([])).toEqual([]);
  });
});

describe("listBaselines", () => {
  // ----- 正常系 -----
  it("入れ子のディレクトリを辿って相対パスで返す", () => {
    place("action/light/a--x.png");
    place("display/dark/b--y.png");

    expect(listBaselines(root)).toEqual(["action/light/a--x.png", "display/dark/b--y.png"]);
  });

  it("画像以外を数えない", () => {
    place("README.md");
    place("action/light/a--x.png");

    expect(listBaselines(root)).toEqual(["action/light/a--x.png"]);
  });

  it("画像が 1 枚も無ければ空を返す", () => {
    expect(listBaselines(root)).toEqual([]);
  });
});

describe("orphanBaselines", () => {
  const expected = ["action/light/a--x.png"];

  // ----- 正常系 -----
  it("撮影対象に対応する画像を孤児にしない", () => {
    expect(orphanBaselines(["action/light/a--x.png"], expected)).toEqual([]);
  });

  it("対応する story が無い画像を孤児として挙げる", () => {
    expect(orphanBaselines(["action/light/消えた--story.png"], expected)).toEqual([
      "action/light/消えた--story.png",
    ]);
  });

  it("系統だけが違う画像を孤児として挙げる", () => {
    expect(orphanBaselines(["display/light/a--x.png"], expected)).toEqual([
      "display/light/a--x.png",
    ]);
  });

  it("テーマだけが違う画像を孤児として挙げる", () => {
    expect(orphanBaselines(["action/dark/a--x.png"], expected)).toEqual(["action/dark/a--x.png"]);
  });

  it("在るべき画像が撮られていないことは孤児にしない", () => {
    expect(orphanBaselines([], expected)).toEqual([]);
  });
});

describe("missingBaselines", () => {
  const expected = ["action/dark/a--x.png", "action/light/a--x.png"];

  // ----- 正常系 -----
  it("撮られていない基準画像を挙げる", () => {
    expect(missingBaselines(["action/light/a--x.png"], expected)).toEqual(["action/dark/a--x.png"]);
  });

  it("すべて撮られていれば空を返す", () => {
    expect(missingBaselines(expected, expected)).toEqual([]);
  });

  it("対応する story を持たない画像は欠けとして挙げない", () => {
    expect(missingBaselines([...expected, "action/light/消えた--story.png"], expected)).toEqual([]);
  });
});
