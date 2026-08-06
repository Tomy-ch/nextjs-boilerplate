import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

describe("bootstrapConfig", () => {
  it("ENV を読み込んでから全 server Config の検証 module を評価する", async () => {
    const loadEnvironment = vi.fn();
    vi.doMock("./load-environment", () => ({ loadEnvironment }));
    vi.doMock("./validate-environment.server", () => ({}));

    const { bootstrapConfig } = await import("./bootstrap.server");

    await expect(bootstrapConfig()).resolves.toBeUndefined();
    expect(loadEnvironment).toHaveBeenCalledOnce();
  });

  it("ENV 読み込みの失敗をそのまま返す", async () => {
    const error = new Error("invalid environment");
    vi.doMock("./load-environment", () => ({
      loadEnvironment: vi.fn(() => {
        throw error;
      }),
    }));

    const { bootstrapConfig } = await import("./bootstrap.server");

    await expect(bootstrapConfig()).rejects.toBe(error);
  });
});
