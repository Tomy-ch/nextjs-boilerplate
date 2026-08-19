import { describe, expect, it } from "vitest";

import { expectedBaselines } from "./expected-baselines";
import type { Story } from "./story-index";
import { SHOT_THEMES } from "./themes";

const story = (id: string, group: string): Story => ({ id, group, title: group, name: id });

describe("expectedBaselines", () => {
  // ----- 正常系 -----
  it("系統 / テーマ / id の 3 区画で組み立てる", () => {
    expect(expectedBaselines([story("action-button--default", "action")])).toEqual([
      "action/light/action-button--default.png",
    ]);
  });

  it("撮る配色テーマの数だけ 1 つの story を数える", () => {
    expect(expectedBaselines([story("a--x", "action")])).toHaveLength(SHOT_THEMES.length);
  });

  it("撮らない配色テーマの基準画像は数えない", () => {
    expect(expectedBaselines([story("a--x", "action")])).not.toContain("action/dark/a--x.png");
  });

  it("撮影対象が空なら空を返す", () => {
    expect(expectedBaselines([])).toEqual([]);
  });
});
