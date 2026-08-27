import { describe, expect, it } from "vitest";

import { buildCookieHeader } from "./session";

describe("buildCookieHeader", () => {
  // ----- 正常系 -----
  it("名前と値だけを取り出し、属性を落とす", () => {
    expect(buildCookieHeader(["app_session=abc; Path=/; HttpOnly; SameSite=Lax"])).toBe(
      "app_session=abc",
    );
  });

  it("複数の cookie を `; ` で連ねる", () => {
    expect(buildCookieHeader(["a=1; Path=/", "b=2; HttpOnly"])).toBe("a=1; b=2");
  });

  it("値が `=` を含んでも切り落とさない", () => {
    expect(buildCookieHeader(["app_session=eyJhbGc=.payload=; Path=/"])).toBe(
      "app_session=eyJhbGc=.payload=",
    );
  });

  it("属性を持たない cookie はそのまま通す", () => {
    expect(buildCookieHeader(["a=1"])).toBe("a=1");
  });

  // ----- 異常系 -----
  it("1 つも無ければ空文字を返す", () => {
    expect(buildCookieHeader([])).toBe("");
  });
});
