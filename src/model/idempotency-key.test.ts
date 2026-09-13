import { afterEach, describe, expect, it, vi } from "vitest";

import { newIdempotencyKey } from "./idempotency-key";

/** 送信を解く側が `z.uuid()` で確かめる形。版と variant の桁が固定されている。 */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("newIdempotencyKey", () => {
  // ----- 正常系 -----
  it("再送を畳める形の鍵を作る", () => {
    expect(newIdempotencyKey()).toMatch(UUID_V4);
  });

  it("呼ぶたびに別の鍵になる", () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });

  it("randomUUID を出さない出所でも鍵を作る", () => {
    const getRandomValues = crypto.getRandomValues.bind(crypto);

    vi.stubGlobal("crypto", { getRandomValues });

    expect(newIdempotencyKey()).toMatch(UUID_V4);
  });
});
