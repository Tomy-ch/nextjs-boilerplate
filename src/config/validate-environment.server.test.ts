import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

describe("validate-environment.server", () => {
  it("import 時に全 purpose の server Config を評価する", async () => {
    const getApiConfig = vi.fn();
    const getAuthConfig = vi.fn();
    const getMediaConfig = vi.fn();
    const getObservabilityConfig = vi.fn();
    vi.doMock("./api/api.server", () => ({ getApiConfig }));
    vi.doMock("./auth/auth.server", () => ({ getAuthConfig }));
    vi.doMock("./media/media.server", () => ({ getMediaConfig }));
    vi.doMock("./observability/observability.server", () => ({ getObservabilityConfig }));

    await import("./validate-environment.server");

    expect(getApiConfig).toHaveBeenCalledOnce();
    expect(getAuthConfig).toHaveBeenCalledOnce();
    expect(getMediaConfig).toHaveBeenCalledOnce();
    expect(getObservabilityConfig).toHaveBeenCalledOnce();
  });
});
