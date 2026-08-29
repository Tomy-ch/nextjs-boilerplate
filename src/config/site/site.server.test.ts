import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubValidEnvironment, VALID_ENVIRONMENT } from "../environment.fixture";

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  stubValidEnvironment();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSiteConfig", () => {
  // ----- 正常系 -----
  it("外から見た origin をそのまま答える", async () => {
    const { getSiteConfig } = await import("./site.server");

    expect(getSiteConfig().publicOrigin).toBe(VALID_ENVIRONMENT.SITE_PUBLIC_ORIGIN);
  });

  it("索引させる指定であれば索引可能と答える", async () => {
    vi.stubEnv("SITE_INDEXABLE", "on");
    const { getSiteConfig } = await import("./site.server");

    expect(getSiteConfig().isIndexable).toBe(true);
  });

  it("索引させない指定であれば索引不可と答える", async () => {
    vi.stubEnv("SITE_INDEXABLE", "off");
    const { getSiteConfig } = await import("./site.server");

    expect(getSiteConfig().isIndexable).toBe(false);
  });

  it("未設定は索引不可と答える", async () => {
    vi.stubEnv("SITE_INDEXABLE", undefined);
    const { getSiteConfig } = await import("./site.server");

    expect(getSiteConfig().isIndexable).toBe(false);
  });

  it("同じ singleton を返す", async () => {
    const { getSiteConfig } = await import("./site.server");

    expect(getSiteConfig()).toBe(getSiteConfig());
  });

  // ----- 異常系 -----
  it("パス付きの origin であれば組み立てを断る", async () => {
    vi.stubEnv("SITE_PUBLIC_ORIGIN", "https://www.example.test/shop");
    const { getSiteConfig } = await import("./site.server");

    expect(() => getSiteConfig()).toThrow("SITE_PUBLIC_ORIGIN");
  });
});
