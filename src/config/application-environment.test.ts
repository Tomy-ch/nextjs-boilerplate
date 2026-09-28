import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  findApplicationEnvironment,
  isDevelopmentOnlyEndpointOpen,
} from "./application-environment";

beforeEach(() => {
  vi.unstubAllEnvs();
  // 実行環境の APP_ENV を前提にしない（`src/config/README.md` のテストの節）。
  vi.stubEnv("APP_ENV", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("findApplicationEnvironment", () => {
  // ----- 正常系 -----
  it("指定された環境を返す", () => {
    vi.stubEnv("APP_ENV", "stg");

    expect(findApplicationEnvironment()).toBe("stg");
  });

  it("APP_ENV 未指定時は null を返す", () => {
    expect(findApplicationEnvironment()).toBeNull();
  });

  // ----- 異常系 -----
  it("選べない環境名を拒否する", () => {
    vi.stubEnv("APP_ENV", "production");

    expect(() => findApplicationEnvironment()).toThrow("APP_ENV は local, ci, dev, stg, prd");
  });
});

describe("isDevelopmentOnlyEndpointOpen", () => {
  // ----- 正常系 -----
  it("開発では開ける", () => {
    vi.stubEnv("APP_ENV", "local");

    expect(isDevelopmentOnlyEndpointOpen()).toBe(true);
  });

  it("CI でも開ける", () => {
    vi.stubEnv("APP_ENV", "ci");

    expect(isDevelopmentOnlyEndpointOpen()).toBe(true);
  });

  // ----- 異常系 -----
  it("実環境では開けない", () => {
    vi.stubEnv("APP_ENV", "prd");

    expect(isDevelopmentOnlyEndpointOpen()).toBe(false);
  });

  it("APP_ENV が明示されていなければ開けない", () => {
    expect(isDevelopmentOnlyEndpointOpen()).toBe(false);
  });
});
