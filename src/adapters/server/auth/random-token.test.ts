import { describe, expect, it } from "vitest";
import { createRandomToken } from "./random-token";

describe("createRandomToken", () => {
  // ----- 正常系 -----
  it("PKCE 検証子の下限を満たす長さで作る", () => {
    expect(createRandomToken()).toHaveLength(43);
  });

  it("base64url の文字だけで作る", () => {
    expect(createRandomToken()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("呼ぶたびに違う値を作る", () => {
    const tokens = new Set(Array.from({ length: 32 }, () => createRandomToken()));

    expect(tokens.size).toBe(32);
  });
});
