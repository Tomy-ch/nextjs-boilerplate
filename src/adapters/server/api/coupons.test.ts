import { beforeEach, describe, expect, it, vi } from "vitest";

import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

import { serveJson, serveStatus } from "../../../../vitest.setup.msw";

const { getAccessToken, getEnvironment, warn } = vi.hoisted(() => ({
  getAccessToken: vi.fn(async (): Promise<string | null> => null),
  getEnvironment: vi.fn(() => PARSED_ENVIRONMENT),
  warn: vi.fn(),
}));

vi.mock("@/config/environment", () => ({ getEnvironment }));
vi.mock("../auth/session", () => ({ getAccessToken }));
vi.mock("@/logging/logging.server", () => ({
  getLogger: () => ({ warn }),
  reportQuietly: (run: () => void) => run(),
}));

import { getMyCartCoupons, getMyCoupons, readMyCartCoupons } from "./coupons";

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

const CART_COUPONS_URL = `${PARSED_ENVIRONMENT.APP_API_BASE_URL}/v1/carts/me/coupons`;

const wireCoupon = {
  id: "0193a1c0-0001-7000-8000-000000000002",
  discount: { kind: "rate", value: "0.10", maxAmount: 1000 },
  scope: { kind: "category", targetId: "0193a1c0-0001-7000-8000-0000000000c1" },
  expiresAt: "2026-12-01T00:00:00Z",
  usedAt: null,
  issuedAt: "2026-09-01T00:00:00Z",
  minPurchaseAmount: 5000,
  usableFrom: null,
};

const wireCartCoupons = {
  coupons: [
    { coupon: wireCoupon, discountAmount: 332 },
    {
      coupon: {
        ...wireCoupon,
        id: "0193a1c0-0001-7000-8000-000000000003",
        discount: { kind: "flat", value: "5.00", maxAmount: null },
        scope: { kind: "all", targetId: null },
      },
      discountAmount: 500,
    },
  ],
};

async function kindOf(run: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await run();
  } catch (error) {
    return findAppError(error)?.kind;
  }

  return undefined;
}

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

describe("getMyCartCoupons", () => {
  // ----- 正常系 -----
  it("契約が返した値引き額を計算し直さず、並びのまま写す", async () => {
    serveJson(CART_COUPONS_URL, wireCartCoupons);

    await expect(getMyCartCoupons()).resolves.toEqual([
      {
        id: "0193a1c0-0001-7000-8000-000000000002",
        discount: { kind: "rate", value: "0.10", maxAmount: 1000 },
        scopeKind: "category",
        discountAmount: 332,
        expiresAt: new Date("2026-12-01T00:00:00Z"),
      },
      {
        id: "0193a1c0-0001-7000-8000-000000000003",
        discount: { kind: "flat", value: "5.00" },
        scopeKind: "all",
        discountAmount: 500,
        expiresAt: new Date("2026-12-01T00:00:00Z"),
      },
    ]);
  });

  it("使えるクーポンが無ければ空配列を返す", async () => {
    serveJson(CART_COUPONS_URL, { coupons: [] });

    await expect(getMyCartCoupons()).resolves.toEqual([]);
  });

  // ----- 異常系 -----
  it("取得の失敗を投げる", async () => {
    serveStatus("get", CART_COUPONS_URL, 503);

    expect(await kindOf(getMyCartCoupons)).toBe(ErrorKind.UNAVAILABLE);
  });

  it("契約に無い形の応答を内層へ渡さない", async () => {
    serveJson(CART_COUPONS_URL, { coupons: [{ coupon: wireCoupon, discountAmount: "332" }] });

    expect(await kindOf(getMyCartCoupons)).toBe(ErrorKind.INTERNAL);
  });
});

describe("readMyCartCoupons", () => {
  // ----- 正常系 -----
  it("読めた候補をそのまま返す", async () => {
    serveJson(CART_COUPONS_URL, { coupons: [] });

    await expect(readMyCartCoupons()).resolves.toEqual([]);
  });

  // ----- 異常系 -----
  it("取得に失敗しても投げず null を返し、失敗を記録する", async () => {
    serveStatus("get", CART_COUPONS_URL, 503);

    await expect(readMyCartCoupons()).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith("使えるクーポンを読めませんでした", expect.any(Object));
  });

  it("認証が通らなくても投げず null を返す", async () => {
    serveStatus("get", CART_COUPONS_URL, 401);

    await expect(readMyCartCoupons()).resolves.toBeNull();
  });
});
