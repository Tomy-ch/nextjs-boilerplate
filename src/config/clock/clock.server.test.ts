import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubValidEnvironment } from "../environment.fixture";

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  stubValidEnvironment();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("getClockConfig", () => {
  // ----- 正常系 -----
  it("固定が指定されていればその瞬間を返す", async () => {
    const { getClockConfig } = await import("./clock.server");

    expect(getClockConfig().now().toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("固定されていても呼ぶたびに別の実体を返す", async () => {
    const { getClockConfig } = await import("./clock.server");
    const config = getClockConfig();

    expect(config.now()).not.toBe(config.now());
  });

  it("空文字は固定しない指定として実時計を読む", async () => {
    vi.stubEnv("CLOCK_FIXED_NOW", "");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T05:00:00.000Z"));
    const { getClockConfig } = await import("./clock.server");

    expect(getClockConfig().now().toISOString()).toBe("2026-08-26T05:00:00.000Z");
  });

  it("未設定は固定しない指定として実時計を読む", async () => {
    vi.stubEnv("CLOCK_FIXED_NOW", undefined);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T05:00:00.000Z"));
    const { getClockConfig } = await import("./clock.server");

    expect(getClockConfig().now().toISOString()).toBe("2026-08-26T05:00:00.000Z");
  });

  it("同じ singleton を返す", async () => {
    const { getClockConfig } = await import("./clock.server");

    expect(getClockConfig()).toBe(getClockConfig());
  });

  // ----- 異常系 -----
  it("日時として読めない指定であれば組み立てを断る", async () => {
    vi.stubEnv("CLOCK_FIXED_NOW", "いつか");
    const { getClockConfig } = await import("./clock.server");

    expect(() => getClockConfig()).toThrow("CLOCK_FIXED_NOW");
  });
});
