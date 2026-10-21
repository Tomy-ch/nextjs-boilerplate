import { beforeEach, describe, expect, it, vi } from "vitest";

import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

import { serveStatus, serveWrite } from "../../../../vitest.setup.msw";

const { getAccessToken, getEnvironment } = vi.hoisted(() => ({
  getAccessToken: vi.fn(async (): Promise<string | null> => null),
  getEnvironment: vi.fn(() => PARSED_ENVIRONMENT),
}));

vi.mock("@/config/environment", () => ({ getEnvironment }));
vi.mock("../auth/session", () => ({ getAccessToken }));

import { claimCampaignCoupon } from "./campaigns";

const CLAIMS_URL = `${PARSED_ENVIRONMENT.APP_API_BASE_URL}/v1/campaigns/claims`;

const wireCoupon = {
  id: "0193a1c0-0001-7000-8000-000000000002",
  discount: { kind: "flat", value: "5.00", maxAmount: null },
  scope: { kind: "all", targetId: null },
  expiresAt: "2026-10-01T00:00:00Z",
  usedAt: null,
  issuedAt: "2026-09-01T00:00:00Z",
  minPurchaseAmount: null,
  usableFrom: null,
};

const KEY = "0198a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a70";

beforeEach(() => {
  vi.clearAllMocks();
  getAccessToken.mockResolvedValue("test-access-token");
});

describe("claimCampaignCoupon", () => {
  // ----- 正常系 -----
  it("入力されたコードを手を加えずに送る", async () => {
    const requests = serveWrite("post", CLAIMS_URL, wireCoupon);

    await claimCampaignCoupon(" welcome-2026 ", KEY);

    await expect(requests[0]?.json()).resolves.toEqual({ code: " welcome-2026 " });
  });

  it("冪等キーをヘッダへ載せる", async () => {
    const requests = serveWrite("post", CLAIMS_URL, wireCoupon);

    await claimCampaignCoupon("WELCOME-2026", KEY);

    expect(requests[0]?.headers.get("Idempotency-Key")).toBe(KEY);
  });

  // ----- 異常系 -----
  it.each([
    [422, ErrorKind.VALIDATION],
    [409, ErrorKind.CONFLICT],
    [400, ErrorKind.INVALID_ARGUMENT],
  ])("%i を %s として投げる", async (status, kind) => {
    serveStatus("post", CLAIMS_URL, status);

    await expect(
      claimCampaignCoupon("WELCOME-2026", KEY).catch((error) => findAppError(error)?.kind),
    ).resolves.toBe(kind);
  });
});
