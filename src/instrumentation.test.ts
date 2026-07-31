import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("正常系", () => {
  it("Edge runtime では Config bootstrap を呼ばない", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    const bootstrapConfig = vi.fn();
    vi.doMock("./config/bootstrap.server", () => ({ bootstrapConfig }));
    const { register } = await import("./instrumentation");

    await register();

    expect(bootstrapConfig).not.toHaveBeenCalled();
  });

  it("Node.js runtime では Config bootstrap を呼ぶ", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const bootstrapConfig = vi.fn();
    vi.doMock("./config/bootstrap.server", () => ({ bootstrapConfig }));
    const { register } = await import("./instrumentation");

    await register();

    expect(bootstrapConfig).toHaveBeenCalledOnce();
  });
});
