import { afterEach, describe, expect, it, vi } from "vitest";

import { newUuid } from "./uuid";

/** 受け取る側が `z.uuid()` で確かめる形。版と variant の桁が固定されている。 */
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("newUuid", () => {
  // ----- 正常系 -----
  it("検証を通る版 7 の形で返す", () => {
    expect(newUuid()).toMatch(UUID_V7);
  });

  it("呼ぶたびに別の値になる", () => {
    expect(newUuid()).not.toBe(newUuid());
  });

  it("同じミリ秒に作っても別の値になる", () => {
    vi.useFakeTimers();

    expect(newUuid()).not.toBe(newUuid());
  });

  it("後から作ったものが、辞書順で後ろに並ぶ", () => {
    vi.useFakeTimers();

    const earlier = newUuid();

    vi.advanceTimersByTime(1);

    expect(newUuid() > earlier).toBe(true);
  });

  it("randomUUID を出さない出所でも作れる", () => {
    const getRandomValues = crypto.getRandomValues.bind(crypto);

    vi.stubGlobal("crypto", { getRandomValues });

    expect(newUuid()).toMatch(UUID_V7);
  });
});
