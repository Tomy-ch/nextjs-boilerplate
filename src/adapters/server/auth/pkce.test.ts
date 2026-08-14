import { describe, expect, it } from "vitest";
import { toCodeChallenge } from "./pkce";

describe("toCodeChallenge", () => {
  // ----- 正常系 -----
  it("RFC 7636 の例と同じ challenge を作る", async () => {
    const challenge = await toCodeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk");

    expect(challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("base64url の文字だけで作る", async () => {
    expect(await toCodeChallenge("verifier")).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("検証子が違えば違う challenge になる", async () => {
    const [first, second] = await Promise.all([
      toCodeChallenge("verifier-1"),
      toCodeChallenge("verifier-2"),
    ]);

    expect(first).not.toBe(second);
  });
});
