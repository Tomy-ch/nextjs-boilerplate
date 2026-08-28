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

describe("getMaintenanceConfig", () => {
  // ----- 正常系 -----
  it("止める指定であれば停止中と答える", async () => {
    vi.stubEnv("APP_MAINTENANCE_MODE", "on");
    const { getMaintenanceConfig } = await import("./maintenance.server");

    expect(getMaintenanceConfig().isStopped).toBe(true);
  });

  it("止めない指定であれば停止中ではないと答える", async () => {
    const { getMaintenanceConfig } = await import("./maintenance.server");

    expect(getMaintenanceConfig().isStopped).toBe(false);
  });

  it("未設定は停止中ではないと答える", async () => {
    vi.stubEnv("APP_MAINTENANCE_MODE", undefined);
    const { getMaintenanceConfig } = await import("./maintenance.server");

    expect(getMaintenanceConfig().isStopped).toBe(false);
  });

  it("同じ singleton を返す", async () => {
    const { getMaintenanceConfig } = await import("./maintenance.server");

    expect(getMaintenanceConfig()).toBe(getMaintenanceConfig());
  });

  // ----- 異常系 -----
  it("選べない指定であれば組み立てを断る", async () => {
    vi.stubEnv("APP_MAINTENANCE_MODE", "true");
    const { getMaintenanceConfig } = await import("./maintenance.server");

    expect(() => getMaintenanceConfig()).toThrow("APP_MAINTENANCE_MODE");
  });
});
