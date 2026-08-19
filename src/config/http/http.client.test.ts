import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getMaxUrlBytes", () => {
  // ----- 正常系 -----
  it("ブラウザへ渡された上限をバイト数として読む", async () => {
    vi.stubEnv("NEXT_PUBLIC_HTTP_MAX_URL_BYTES", "8000");
    const { getMaxUrlBytes } = await import("./http.client");

    expect(getMaxUrlBytes()).toBe(8000);
  });

  it("2 度目以降は同じ値を返す", async () => {
    vi.stubEnv("NEXT_PUBLIC_HTTP_MAX_URL_BYTES", "8000");
    const { getMaxUrlBytes } = await import("./http.client");

    expect(getMaxUrlBytes()).toBe(getMaxUrlBytes());
  });

  // ----- 異常系 -----
  it("上限が届いていなければ読み取りを断る", async () => {
    vi.stubEnv("NEXT_PUBLIC_HTTP_MAX_URL_BYTES", undefined);
    const { getMaxUrlBytes } = await import("./http.client");

    expect(() => getMaxUrlBytes()).toThrow();
  });
});
