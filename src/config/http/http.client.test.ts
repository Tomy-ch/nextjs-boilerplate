import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("MAX_URL_BYTES", () => {
  // ----- 正常系 -----
  it("ブラウザへ渡された上限をバイト数として読む", async () => {
    vi.stubEnv("NEXT_PUBLIC_HTTP_MAX_URL_BYTES", "8000");

    const { MAX_URL_BYTES } = await import("./http.client");

    expect(MAX_URL_BYTES).toBe(8000);
  });
});
