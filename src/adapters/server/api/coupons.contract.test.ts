import { describe, expect, it, vi } from "vitest";
import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";
import "../../../../vitest.setup.msw";

const { getAccessToken, getEnvironment } = vi.hoisted(() => ({
  getAccessToken: vi.fn(async (): Promise<string | null> => "test-access-token"),
  getEnvironment: vi.fn(() => PARSED_ENVIRONMENT),
}));

vi.mock("@/config/environment", () => ({ getEnvironment }));
vi.mock("../auth/session", () => ({ getAccessToken }));

import { getMyCoupons } from "./coupons";

/** 表示用の保有クーポンが公開する項目。 */
const HELD_COUPON_KEYS = [
  "discount",
  "expiresAt",
  "id",
  "minPurchaseAmount",
  "scopeKind",
  "usableFrom",
  "usedAt",
];

describe("getMyCoupons", () => {
  // ----- 正常系 -----
  it("生成ハンドラの応答から、表示に使う項目だけを組み立てる", async () => {
    const coupons = await getMyCoupons();

    expect(coupons.length).toBeGreaterThan(0);
    for (const coupon of coupons) {
      expect(Object.keys(coupon).sort()).toEqual(HELD_COUPON_KEYS);
    }
  });
});
