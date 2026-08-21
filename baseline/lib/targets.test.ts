import { describe, expect, it } from "vitest";

import { SCREEN_AREA } from "./store";
import { retakenTargets } from "./targets";

describe("retakenTargets", () => {
  // ----- 正常系 -----
  it("story の画像から id を取り出す", () => {
    expect(retakenTargets(["A\taction/light/button--default.png"])).toEqual({
      stories: ["button--default"],
      screens: [],
    });
  });

  it("画面の画像から名前を取り出す", () => {
    expect(retakenTargets([`M\t${SCREEN_AREA}/desktop/top.png`])).toEqual({
      stories: [],
      screens: ["top"],
    });
  });

  it("同じ名前でも区画が違えば別の対象として扱う", () => {
    expect(
      retakenTargets(["A\taction/light/top.png", `A\t${SCREEN_AREA}/desktop/top.png`]),
    ).toEqual({ stories: ["top"], screens: ["top"] });
  });

  it("story と画面を混ぜて渡しても種類ごとに分かれる", () => {
    expect(
      retakenTargets(["M\tform/dark/input--error.png", `M\t${SCREEN_AREA}/mobile/sign-in.png`]),
    ).toEqual({ stories: ["input--error"], screens: ["sign-in"] });
  });

  it("テーマ違い・帯違いの同じ対象を 1 つに畳む", () => {
    expect(
      retakenTargets([
        "M\taction/light/button--default.png",
        "M\taction/dark/button--default.png",
        `M\t${SCREEN_AREA}/desktop/top.png`,
        `M\t${SCREEN_AREA}/mobile/top.png`,
      ]),
    ).toEqual({ stories: ["button--default"], screens: ["top"] });
  });

  it("畳んだあとも最初に現れた順序のまま並べる", () => {
    expect(
      retakenTargets([
        "M\tform/light/b--x.png",
        "M\taction/light/a--y.png",
        "M\tform/dark/b--x.png",
      ]).stories,
    ).toEqual(["b--x", "a--y"]);
  });

  it("改名された画像は行き先の名前で数える", () => {
    expect(retakenTargets(["R100\taction/light/old--x.png\taction/light/new--x.png"])).toEqual({
      stories: ["new--x"],
      screens: [],
    });
  });

  it("置き場自身の説明と入力のハッシュを落とす", () => {
    expect(retakenTargets(["M\tREADME.md", "M\trender-inputs.sha256"])).toEqual({
      stories: [],
      screens: [],
    });
  });

  it("何も渡されなければ空を返す", () => {
    expect(retakenTargets([])).toEqual({ stories: [], screens: [] });
  });

  // ----- 異常系 -----
  it("消えた画像を対象にしない", () => {
    expect(retakenTargets(["D\taction/light/gone--x.png"])).toEqual({
      stories: [],
      screens: [],
    });
  });

  it("区画はあるが画像でないものを落とす", () => {
    expect(retakenTargets(["M\taction/light/notes.txt"])).toEqual({
      stories: [],
      screens: [],
    });
  });

  it("区画を持たない画像を落とす", () => {
    expect(retakenTargets(["A\tstray.png"])).toEqual({ stories: [], screens: [] });
  });

  it("状態とパスに分かれていない行を落とす", () => {
    expect(retakenTargets([""])).toEqual({ stories: [], screens: [] });
  });
});
