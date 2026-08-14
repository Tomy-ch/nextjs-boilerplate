import { describe, expect, it } from "vitest";

import { expectedScreenBaselines } from "./screen-baselines";

const home = { route: "/", name: "home", path: "/" };
const login = { route: "/login", name: "login", path: "/login" };
const mobile = { name: "mobile", width: 767 };
const desktop = { name: "desktop", width: 1024 };

describe("expectedScreenBaselines", () => {
  // ----- 正常系 -----
  it("帯 / 画面の 2 区画で組み立てる", () => {
    expect(expectedScreenBaselines([home], [mobile])).toEqual(["mobile/home.png"]);
  });

  it("帯の数だけ 1 つの画面を数える", () => {
    expect(expectedScreenBaselines([home], [mobile, desktop])).toEqual([
      "desktop/home.png",
      "mobile/home.png",
    ]);
  });

  it("画面が増えた分だけ数える", () => {
    expect(expectedScreenBaselines([home, login], [mobile])).toHaveLength(2);
  });

  it("撮影対象が空なら空を返す", () => {
    expect(expectedScreenBaselines([], [mobile])).toEqual([]);
  });
});
