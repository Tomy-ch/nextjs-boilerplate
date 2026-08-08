import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubValidEnvironment } from "../environment.fixture";

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  stubValidEnvironment();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getMediaConfig", () => {
  // ----- 正常系 -----
  it("環境変数からメディアの配信元を組み立てる", async () => {
    const { getMediaConfig } = await import("./media.server");

    expect(getMediaConfig()).toMatchObject({ origin: "https://media.example.test" });
  });

  it("同じ singleton を返す", async () => {
    const { getMediaConfig } = await import("./media.server");

    expect(getMediaConfig()).toBe(getMediaConfig());
  });

  // ----- 異常系 -----
  it("配信元が欠落していれば組み立てを断る", async () => {
    vi.stubEnv("MEDIA_ORIGIN", undefined);
    const { getMediaConfig } = await import("./media.server");

    expect(() => getMediaConfig()).toThrow("MEDIA_ORIGIN");
  });
});
