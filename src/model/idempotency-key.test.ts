import { describe, expect, it } from "vitest";

import { newIdempotencyKey } from "./idempotency-key";

describe("newIdempotencyKey", () => {
  // ----- 正常系 -----
  it("再送を畳める形の鍵を作る", () => {
    expect(newIdempotencyKey()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("呼ぶたびに別の鍵になる", () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });
});
