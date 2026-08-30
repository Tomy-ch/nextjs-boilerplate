import { describe, expect, it } from "vitest";

import { containsUnsafe } from "./accepted-chars";

describe("containsUnsafe", () => {
  // ----- 正常系 -----
  it("英数と経路・版・区切りの記号だけなら通す", () => {
    expect(containsUnsafe("feature/419-consent-gate", "admin-dashboard,home", "v0.6.0")).toBe(false);
  });

  it("値を 1 つも渡さなければ通す", () => {
    expect(containsUnsafe()).toBe(false);
  });

  it("空文字は通す", () => {
    expect(containsUnsafe("")).toBe(false);
  });

  // ----- 異常系 -----
  it("シェルが解釈する記号を含む値を落とす", () => {
    expect(containsUnsafe("home;rm -rf /")).toBe(true);
  });

  it("markdown の記法になる記号を含む値を落とす", () => {
    expect(containsUnsafe("`id`")).toBe(true);
  });

  it("並べた値のうち 1 つでも外れていれば落とす", () => {
    expect(containsUnsafe("home", "admin$(id)")).toBe(true);
  });
});
