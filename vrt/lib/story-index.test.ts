import { describe, expect, it } from "vitest";

import type { ExcludedStory } from "./excluded-stories";
import { excludeDeclared, parseStoryIndex, selectStories, storyURL } from "./story-index";

/** 目録 1 件分の JSON を組み立てる。 */
function indexOf(entries: Record<string, unknown>): string {
  return JSON.stringify({ v: 5, entries });
}

const story = (id: string, extra: Record<string, unknown> = {}) => ({
  type: "story",
  id,
  title: "Action/Button",
  name: "Default",
  ...extra,
});

describe("parseStoryIndex", () => {
  // ----- 正常系 -----
  it("story を id 順で返す", () => {
    const json = indexOf({ b: story("b--x"), a: story("a--x") });

    expect(parseStoryIndex(json).map((entry) => entry.id)).toEqual(["a--x", "b--x"]);
  });

  it("見出しと表示名を持ち回る", () => {
    const json = indexOf({ a: story("a--x") });

    expect(parseStoryIndex(json)[0]).toEqual({
      id: "a--x",
      title: "Action/Button",
      name: "Default",
    });
  });

  it("docs ページを対象にしない", () => {
    const json = indexOf({ d: { type: "docs", id: "a--docs" }, a: story("a--x") });

    expect(parseStoryIndex(json).map((entry) => entry.id)).toEqual(["a--x"]);
  });

  // ----- 異常系 -----
  it("entries を持たない目録を落とす", () => {
    expect(() => parseStoryIndex(JSON.stringify({ v: 5 }))).toThrow(
      "story 目録に entries がありません",
    );
  });

  it("entries が object でない目録を落とす", () => {
    expect(() => parseStoryIndex(JSON.stringify({ entries: null }))).toThrow(
      "story 目録に entries がありません",
    );
  });

  it("撮影対象が 1 件も無い目録を落とす", () => {
    expect(() => parseStoryIndex(indexOf({ d: { type: "docs", id: "a--docs" } }))).toThrow(
      "story 目録に撮影対象がありません",
    );
  });

  it("id / 見出し / 表示名を欠く entry を対象にしない", () => {
    const json = indexOf({ broken: { type: "story", id: "a--x" }, a: story("b--x") });

    expect(parseStoryIndex(json).map((entry) => entry.id)).toEqual(["b--x"]);
  });
});

describe("storyURL", () => {
  // ----- 正常系 -----
  it("story の id と配色テーマを載せた URL を組み立てる", () => {
    expect(storyURL("action-button--default", "dark")).toBe(
      "/iframe.html?id=action-button--default&globals=theme%3Adark&viewMode=story",
    );
  });
});

describe("selectStories", () => {
  const stories = [
    { id: "a--x", title: "A", name: "X" },
    { id: "b--y", title: "B", name: "Y" },
  ];

  // ----- 正常系 -----
  it("指定が無ければ全数を返す", () => {
    expect(selectStories(stories, undefined)).toEqual(stories);
  });

  it("指定が空文字なら全数を返す", () => {
    expect(selectStories(stories, "")).toEqual(stories);
  });

  it("id で撮影対象を絞る", () => {
    expect(selectStories(stories, "b--y")).toEqual([stories[1]]);
  });

  it("区切りの前後の空白を無視する", () => {
    expect(selectStories(stories, " a--x , b--y ")).toEqual(stories);
  });

  // ----- 異常系 -----
  it("どの story にも当たらない指定を落とす", () => {
    expect(() => selectStories(stories, "存在しない")).toThrow(
      "VRT_ONLY に該当する story がありません: 存在しない",
    );
  });
});

describe("excludeDeclared", () => {
  const stories = [
    { id: "a--x", title: "A", name: "X" },
    { id: "b--y", title: "B", name: "Y" },
  ];
  const declare = (id: string): ExcludedStory => ({ id, reason: "理由", removeWhen: "条件" });

  // ----- 正常系 -----
  it("宣言された story を撮影対象から外す", () => {
    expect(excludeDeclared(stories, [declare("a--x")])).toEqual([stories[1]]);
  });

  it("宣言が無ければ全数をそのまま返す", () => {
    expect(excludeDeclared(stories, [])).toEqual(stories);
  });

  // ----- 異常系 -----
  it("どの story にも当たらない宣言を落とす", () => {
    expect(() => excludeDeclared(stories, [declare("消えた--story")])).toThrow(
      "除外の宣言が指す story がありません: 消えた--story",
    );
  });

  it("撮影対象を空にする宣言を落とす", () => {
    expect(() => excludeDeclared(stories, [declare("a--x"), declare("b--y")])).toThrow(
      "除外の宣言が撮影対象を空にしました",
    );
  });
});
