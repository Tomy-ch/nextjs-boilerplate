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

describe("getHttpConfig", () => {
  // ----- 正常系 -----
  it("環境変数から URL の上限バイト数を組み立てる", async () => {
    const { getHttpConfig } = await import("./http.server");

    expect(getHttpConfig()).toMatchObject({ maxUrlBytes: 8000 });
  });

  it("環境変数からアップロードの上限バイト数を組み立てる", async () => {
    const { getHttpConfig } = await import("./http.server");

    expect(getHttpConfig()).toMatchObject({ maxUploadBytes: 4194304 });
  });

  it("環境変数から別 origin の許可一覧を組み立てる", async () => {
    vi.stubEnv("HTTP_ALLOWED_ORIGINS", "https://partner.example.test");
    const { getHttpConfig } = await import("./http.server");

    expect(getHttpConfig().allowedOrigins).toStrictEqual(["https://partner.example.test"]);
  });

  it("許可一覧が未指定なら同一 origin だけにする", async () => {
    const { getHttpConfig } = await import("./http.server");

    expect(getHttpConfig().allowedOrigins).toStrictEqual([]);
  });

  it("同じ singleton を返す", async () => {
    const { getHttpConfig } = await import("./http.server");

    expect(getHttpConfig()).toBe(getHttpConfig());
  });

  // ----- 異常系 -----
  it("URL の上限バイト数が欠落していれば組み立てを断る", async () => {
    vi.stubEnv("NEXT_PUBLIC_HTTP_MAX_URL_BYTES", undefined);
    const { getHttpConfig } = await import("./http.server");

    expect(() => getHttpConfig()).toThrow("NEXT_PUBLIC_HTTP_MAX_URL_BYTES");
  });

  it("アップロードの上限バイト数が欠落していれば組み立てを断る", async () => {
    vi.stubEnv("NEXT_PUBLIC_HTTP_MAX_UPLOAD_BYTES", undefined);
    const { getHttpConfig } = await import("./http.server");

    expect(() => getHttpConfig()).toThrow("NEXT_PUBLIC_HTTP_MAX_UPLOAD_BYTES");
  });
});
