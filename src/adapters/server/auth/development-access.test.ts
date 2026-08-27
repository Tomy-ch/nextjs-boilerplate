import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { headers, isDevelopmentOnlyEndpointOpen } = vi.hoisted(() => ({
  headers: vi.fn(),
  isDevelopmentOnlyEndpointOpen: vi.fn(() => true),
}));

vi.mock("next/headers", () => ({ headers }));
vi.mock("@/config/load-environment", () => ({ isDevelopmentOnlyEndpointOpen }));

import { isDevelopmentAccessAllowed } from "./development-access";

function stubHeaders(entries: Readonly<Record<string, string>>): void {
  headers.mockResolvedValue(new Headers(entries));
}

beforeEach(() => {
  isDevelopmentOnlyEndpointOpen.mockReturnValue(true);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("isDevelopmentAccessAllowed", () => {
  // ----- 正常系 -----
  it("手元の宛先なら開ける", async () => {
    stubHeaders({ host: "localhost:3000" });

    expect(await isDevelopmentAccessAllowed()).toBe(true);
  });

  it("ループバックの IP も手元の宛先として扱う", async () => {
    stubHeaders({ host: "127.0.0.1:3000" });

    expect(await isDevelopmentAccessAllowed()).toBe(true);
  });

  it("IPv6 の表記でも手元の宛先として扱う", async () => {
    stubHeaders({ host: "[::1]:3000" });

    expect(await isDevelopmentAccessAllowed()).toBe(true);
  });

  it("コンテナから見た開発機の名前も手元の宛先として扱う", async () => {
    stubHeaders({ host: "host.docker.internal:3000" });

    expect(await isDevelopmentAccessAllowed()).toBe(true);
  });

  // ----- 異常系 -----
  it("開ける環境でなければ、宛先が手元でも閉じる", async () => {
    isDevelopmentOnlyEndpointOpen.mockReturnValue(false);
    stubHeaders({ host: "localhost:3000" });

    expect(await isDevelopmentAccessAllowed()).toBe(false);
  });

  it("公開ドメインを名乗る要求は閉じる", async () => {
    stubHeaders({ host: "shop.example.com" });

    expect(await isDevelopmentAccessAllowed()).toBe(false);
  });

  it("転送された宛先が公開ドメインなら閉じる", async () => {
    stubHeaders({ host: "localhost:3000", "x-forwarded-host": "shop.example.com" });

    expect(await isDevelopmentAccessAllowed()).toBe(false);
  });

  it("宛先を名乗らない要求は閉じる", async () => {
    stubHeaders({});

    expect(await isDevelopmentAccessAllowed()).toBe(false);
  });
});
