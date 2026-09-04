import { describe, expect, it } from "vitest";

import { unavailableLoginPath } from "./login-notice";

describe("unavailableLoginPath", () => {
  // ----- 正常系 -----
  it("戻り先とともに、始められなかった理由を載せる", () => {
    expect(unavailableLoginPath("/account")).toBe("/login?returnUrl=%2Faccount&error=unavailable");
  });

  it("戻り先が無くても理由は載る", () => {
    expect(unavailableLoginPath("")).toBe("/login?returnUrl=%2F&error=unavailable");
  });

  // ----- 異常系 -----
  it("外部の URL を渡されても自サイトの既定へ倒す", () => {
    expect(unavailableLoginPath("https://evil.test/steal")).toBe(
      "/login?returnUrl=%2F&error=unavailable",
    );
  });
});
