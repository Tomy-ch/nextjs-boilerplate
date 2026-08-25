import { describe, expect, it } from "vitest";

import { SCREEN_AREA } from "./store";
import { retakenTargets } from "./targets";

describe("retakenTargets", () => {
  // ----- 正常系 -----
  it("story の画像から id を取り出す", () => {
    expect(retakenTargets(["A\taction/light/button--default.png"])).toEqual({
      stories: ["button--default"],
      screens: [],
      images: ["action/light/button--default.png"],
      added: ["action/light/button--default.png"],
    });
  });

  it("画面の画像から名前を取り出す", () => {
    expect(retakenTargets([`M\t${SCREEN_AREA}/desktop/top.png`])).toEqual({
      stories: [],
      screens: ["top"],
      images: [`${SCREEN_AREA}/desktop/top.png`],
      added: [],
    });
  });

  it("同じ名前でも区画が違えば別の対象として扱う", () => {
    expect(
      retakenTargets(["A\taction/light/top.png", `A\t${SCREEN_AREA}/desktop/top.png`]),
    ).toEqual({
      stories: ["top"],
      screens: ["top"],
      images: ["action/light/top.png", `${SCREEN_AREA}/desktop/top.png`],
      added: ["action/light/top.png", `${SCREEN_AREA}/desktop/top.png`],
    });
  });

  it("story と画面を混ぜて渡しても種類ごとに分かれる", () => {
    expect(
      retakenTargets(["M\tform/dark/input--error.png", `M\t${SCREEN_AREA}/mobile/sign-in.png`]),
    ).toEqual({
      stories: ["input--error"],
      screens: ["sign-in"],
      images: ["form/dark/input--error.png", `${SCREEN_AREA}/mobile/sign-in.png`],
      added: [],
    });
  });

  it("テーマ違い・帯違いの同じ対象を 1 つに畳む", () => {
    expect(
      retakenTargets([
        "M\taction/light/button--default.png",
        "M\taction/dark/button--default.png",
        `M\t${SCREEN_AREA}/desktop/top.png`,
        `M\t${SCREEN_AREA}/mobile/top.png`,
      ]),
    ).toEqual({
      stories: ["button--default"],
      screens: ["top"],
      images: [
        "action/light/button--default.png",
        "action/dark/button--default.png",
        `${SCREEN_AREA}/desktop/top.png`,
        `${SCREEN_AREA}/mobile/top.png`,
      ],
      added: [],
    });
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

  it("初めて置かれた画像だけを added に入れる", () => {
    expect(retakenTargets(["A\taction/light/new--x.png", "M\taction/light/old--x.png"])).toEqual({
      stories: ["new--x", "old--x"],
      screens: [],
      images: ["action/light/new--x.png", "action/light/old--x.png"],
      added: ["action/light/new--x.png"],
    });
  });

  it("改名された画像は行き先の名前で数える", () => {
    expect(retakenTargets(["R100\taction/light/old--x.png\taction/light/new--x.png"])).toEqual({
      stories: ["new--x"],
      screens: [],
      images: ["action/light/new--x.png"],
      added: [],
    });
  });

  it("置き場自身の説明と入力のハッシュを落とす", () => {
    expect(retakenTargets(["M\tREADME.md", "M\trender-inputs.sha256"])).toEqual({
      stories: [],
      screens: [],
      images: [],
      added: [],
    });
  });

  it("何も渡されなければ空を返す", () => {
    expect(retakenTargets([])).toEqual({ stories: [], screens: [], images: [], added: [] });
  });

  // ----- 異常系 -----
  it("消えた画像を対象にしない", () => {
    expect(retakenTargets(["D\taction/light/gone--x.png"])).toEqual({
      stories: [],
      screens: [],
      images: [],
      added: [],
    });
  });

  it("区画はあるが画像でないものを落とす", () => {
    expect(retakenTargets(["M\taction/light/notes.txt"])).toEqual({
      stories: [],
      screens: [],
      images: [],
      added: [],
    });
  });

  it("区画を持たない画像を落とす", () => {
    expect(retakenTargets(["A\tstray.png"])).toEqual({
      stories: [],
      screens: [],
      images: [],
      added: [],
    });
  });

  it("状態とパスに分かれていない行を落とす", () => {
    expect(retakenTargets([""])).toEqual({ stories: [], screens: [], images: [], added: [] });
  });
});
