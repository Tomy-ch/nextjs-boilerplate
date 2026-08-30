import { describe, expect, it } from "vitest";

import { parseCookiePairs } from "./session";

describe("parseCookiePairs", () => {
  // ----- 正常系 -----
  it("名前と値だけを取り出し、属性を落とす", () => {
    expect(parseCookiePairs(["app_session=abc; Path=/; HttpOnly; SameSite=Lax"])).toEqual([
      ["app_session", "abc"],
    ]);
  });

  it("複数の cookie をそれぞれ組にする", () => {
    expect(parseCookiePairs(["a=1; Path=/", "b=2; HttpOnly"])).toEqual([
      ["a", "1"],
      ["b", "2"],
    ]);
  });

  it("値が `=` を含んでも切り落とさない", () => {
    expect(parseCookiePairs(["app_session=eyJhbGc=.payload=; Path=/"])).toEqual([
      ["app_session", "eyJhbGc=.payload="],
    ]);
  });

  it("属性を持たない cookie はそのまま通す", () => {
    expect(parseCookiePairs(["a=1"])).toEqual([["a", "1"]]);
  });

  // ----- 異常系 -----
  it("1 つも無ければ空を返す", () => {
    expect(parseCookiePairs([])).toEqual([]);
  });

  it("`=` を持たない綴りは、値の無い名前として扱う", () => {
    expect(parseCookiePairs(["broken; Path=/"])).toEqual([["broken", ""]]);
  });
});
