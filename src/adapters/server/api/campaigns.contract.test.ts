import { describe, expect, it, vi } from "vitest";
import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";
import "../../../../vitest.setup.msw";

const { getAccessToken, getEnvironment } = vi.hoisted(() => ({
  getAccessToken: vi.fn(async (): Promise<string | null> => null),
  getEnvironment: vi.fn(() => PARSED_ENVIRONMENT),
}));

vi.mock("@/config/environment", () => ({ getEnvironment }));
vi.mock("../auth/session", () => ({ getAccessToken }));

import { createCampaign } from "./campaigns";

describe("createCampaign", () => {
  // ----- 正常系 -----
  it("生成ハンドラの応答を、契約の形として受け入れる", async () => {
    getAccessToken.mockResolvedValueOnce("access-token");

    await expect(
      createCampaign(
        {
          code: "WELCOME-2026",
          discount: { kind: "flat", value: "5.00" },
          scope: { kind: "all" },
          minPurchaseAmount: null,
          usableFrom: null,
          couponExpiresAt: new Date("2026-12-31T14:59:59Z"),
          startsAt: new Date("2026-10-01T00:00:00Z"),
          endsAt: new Date("2026-11-30T14:59:59Z"),
          totalLimit: 1000,
          perUserLimit: 1,
        },
        "idempotency-key",
      ),
    ).resolves.toBeUndefined();
  });
});
