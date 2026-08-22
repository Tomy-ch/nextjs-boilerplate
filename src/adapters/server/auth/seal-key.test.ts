import { describe, expect, it } from "vitest";

import { deriveSealKey } from "./seal-key";

describe("deriveSealKey", () => {
  // ----- 正常系 -----
  it("長さの決まっていない秘密値から、A256GCM が要求する 32 バイトの鍵を導く", async () => {
    expect((await deriveSealKey("短い")).byteLength).toBe(32);
    expect((await deriveSealKey("x".repeat(200))).byteLength).toBe(32);
  });

  it("同じ秘密値からは同じ鍵を導く", async () => {
    expect(await deriveSealKey("session-secret")).toEqual(await deriveSealKey("session-secret"));
  });

  it("違う秘密値からは違う鍵を導く", async () => {
    expect(await deriveSealKey("session-secret")).not.toEqual(await deriveSealKey("other-secret"));
  });
});
