import { beforeEach, describe, expect, it, vi } from "vitest";

import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

import { serveJson, serveStatus } from "../../../../vitest.setup.msw";

const { getAccessToken, getEnvironment } = vi.hoisted(() => ({
  getAccessToken: vi.fn(async (): Promise<string | null> => null),
  getEnvironment: vi.fn(() => PARSED_ENVIRONMENT),
}));

vi.mock("@/config/environment", () => ({ getEnvironment }));
vi.mock("../auth/session", () => ({ getAccessToken }));

import { getMyCoupons } from "./coupons";

const MY_COUPONS_URL = `${PARSED_ENVIRONMENT.APP_API_BASE_URL}/v1/users/me/coupons`;

const wireUnused = {
  id: "0193a1c0-0001-7000-8000-000000000002",
  discount: { kind: "rate", value: "0.10", maxAmount: 1000 },
  scope: { kind: "category", targetId: "0193a1c0-0002-7000-8000-000000000001" },
  expiresAt: "2026-10-01T00:00:00Z",
  usedAt: null,
  issuedAt: "2026-09-01T00:00:00Z",
  minPurchaseAmount: 5000,
  usableFrom: "2026-09-15T00:00:00Z",
};

const wireUsed = {
  id: "0193a1c0-0001-7000-8000-000000000001",
  discount: { kind: "flat", value: "5.00", maxAmount: null },
  scope: { kind: "all", targetId: null },
  expiresAt: "2026-09-30T00:00:00Z",
  usedAt: "2026-08-20T12:00:00Z",
  issuedAt: "2026-08-01T00:00:00Z",
  minPurchaseAmount: null,
  usableFrom: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  getAccessToken.mockResolvedValue("test-access-token");
});

describe("getMyCoupons", () => {
  // ----- 正常系 -----
  it("契約の保有クーポンを、時刻を Date にした表示用の型へ写す", async () => {
    serveJson(MY_COUPONS_URL, { coupons: [wireUnused] });

    await expect(getMyCoupons()).resolves.toEqual([
      {
        id: wireUnused.id,
        discount: { kind: "rate", value: "0.10", maxAmount: 1000 },
        scopeKind: "category",
        minPurchaseAmount: 5000,
        usableFrom: new Date("2026-09-15T00:00:00Z"),
        expiresAt: new Date("2026-10-01T00:00:00Z"),
        usedAt: null,
      },
    ]);
  });

  it("使用済みも落とさず、応答の順序のまま返す", async () => {
    serveJson(MY_COUPONS_URL, { coupons: [wireUnused, wireUsed] });

    const coupons = await getMyCoupons();

    expect(coupons.map(({ id }) => id)).toEqual([wireUnused.id, wireUsed.id]);
    expect(coupons[1]).toMatchObject({
      discount: { kind: "flat", value: "5.00" },
      usableFrom: null,
      usedAt: new Date("2026-08-20T12:00:00Z"),
    });
  });

  it("1 枚も無ければ空配列を返す", async () => {
    serveJson(MY_COUPONS_URL, { coupons: [] });

    await expect(getMyCoupons()).resolves.toEqual([]);
  });

  // ----- 異常系 -----
  it("一時的に応答できないときは unavailable として投げる", async () => {
    serveStatus("get", MY_COUPONS_URL, 503);

    await expect(getMyCoupons().catch((error) => findAppError(error)?.kind)).resolves.toBe(
      ErrorKind.UNAVAILABLE,
    );
  });

  it("契約に合わない応答は受け取らない", async () => {
    serveJson(MY_COUPONS_URL, { coupons: [{ ...wireUnused, expiresAt: "not-a-date" }] });

    await expect(getMyCoupons()).rejects.toThrow();
  });
});
