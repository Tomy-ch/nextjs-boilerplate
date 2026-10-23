import { beforeEach, describe, expect, it, vi } from "vitest";
import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { toCampaignId } from "@/model/campaign/campaign";
import { serveJson, serveStatus, serveWrite } from "../../../../vitest.setup.msw";
import { getCampaignsQueryPerPageMax } from "../../gen/api/endpoints.zod";

const { getAccessToken, getEnvironment } = vi.hoisted(() => ({
  getAccessToken: vi.fn(async (): Promise<string | null> => "access-token"),
  getEnvironment: vi.fn(() => PARSED_ENVIRONMENT),
}));

vi.mock("@/config/environment", () => ({ getEnvironment }));
vi.mock("../auth/session", () => ({ getAccessToken }));

import {
  CAMPAIGN_PAGE_MAX,
  claimCampaignCoupon,
  getCampaignPage,
  suspendCampaign,
} from "./campaigns";

const CAMPAIGN_ID = "0193a1c0-0002-7000-8000-000000000003";

const CAMPAIGNS_URL = `${PARSED_ENVIRONMENT.APP_API_BASE_URL}/v1/campaigns`;
const SUSPEND_URL = `${CAMPAIGNS_URL}/:campaignId/suspend`;

const PER_PAGE = 20;

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

const KEY = "00000000-0000-4000-8000-000000000001";

const wireCampaign = {
  id: CAMPAIGN_ID,
  code: "WELCOME-2026",
  discount: { kind: "rate", value: "0.10", maxAmount: 2000 },
  scope: { kind: "category", targetId: "0193a1c0-0002-7000-8000-0000000000c1" },
  minPurchaseAmount: 5000,
  usableFrom: null,
  couponExpiresAt: "2026-12-31T14:59:59Z",
  startsAt: "2026-10-01T00:00:00Z",
  endsAt: "2026-11-01T00:00:00Z",
  totalLimit: 100,
  perUserLimit: 1,
  issuedCount: 40,
  suspendedAt: null,
};

/** 投げられたエラーに付いた分類を返す。投げなければ undefined。 */
async function kindOf(run: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await run();
  } catch (error) {
    return findAppError(error)?.kind;
  }

  return undefined;
}

describe("CAMPAIGN_PAGE_MAX", () => {
  it("契約が宣言するページ番号の上限をそのまま公開する", () => {
    expect(CAMPAIGN_PAGE_MAX).toBe(10000);
  });
});

describe("getCampaignPage", () => {
  // ----- 正常系 -----
  it("契約の応答を、一覧が並べる形へ写す", async () => {
    serveJson(CAMPAIGNS_URL, { campaigns: [wireCampaign], total: 1 });

    await expect(getCampaignPage({ page: 1, perPage: PER_PAGE })).resolves.toEqual({
      items: [
        {
          id: CAMPAIGN_ID,
          code: "WELCOME-2026",
          discount: { kind: "rate", value: "0.10", maxAmount: 2000 },
          scopeKind: "category",
          startsAt: "2026-10-01T00:00:00Z",
          endsAt: "2026-11-01T00:00:00Z",
          couponExpiresAt: "2026-12-31T14:59:59Z",
          totalLimit: 100,
          issuedCount: 40,
          suspendedAt: null,
        },
      ],
      total: 1,
      perPage: PER_PAGE,
      offset: 0,
    });
  });

  it("契約が返さない位置を、送ったページ番号と件数から組む", async () => {
    serveJson(CAMPAIGNS_URL, { campaigns: [], total: 45 });

    await expect(getCampaignPage({ page: 3, perPage: PER_PAGE })).resolves.toMatchObject({
      total: 45,
      perPage: PER_PAGE,
      offset: 40,
    });
  });

  it("ページ番号と 1 ページの件数をクエリへ載せる", async () => {
    const requests = serveJson(CAMPAIGNS_URL, { campaigns: [], total: 0 });

    await getCampaignPage({ page: 2, perPage: PER_PAGE });

    const url = new URL(requests[0]?.url ?? "");

    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("perPage")).toBe(String(PER_PAGE));
  });

  it("契約の上限ちょうどのページ番号と件数は、そのまま送る", async () => {
    const requests = serveJson(CAMPAIGNS_URL, { campaigns: [], total: 0 });

    await getCampaignPage({ page: CAMPAIGN_PAGE_MAX, perPage: getCampaignsQueryPerPageMax });

    const url = new URL(requests[0]?.url ?? "");

    expect(url.searchParams.get("page")).toBe(String(CAMPAIGN_PAGE_MAX));
    expect(url.searchParams.get("perPage")).toBe(String(getCampaignsQueryPerPageMax));
  });

  it("停止済みのキャンペーンは停止日時を伴って届く", async () => {
    serveJson(CAMPAIGNS_URL, {
      campaigns: [{ ...wireCampaign, suspendedAt: "2026-10-05T03:00:00Z" }],
      total: 1,
    });

    await expect(
      getCampaignPage({ page: 1, perPage: PER_PAGE }).then((page) => page.items[0]?.suspendedAt),
    ).resolves.toBe("2026-10-05T03:00:00Z");
  });

  // ----- 異常系 -----
  it("契約が拒むページ番号は送る前に止める", async () => {
    const requests = serveJson(CAMPAIGNS_URL, { campaigns: [], total: 0 });

    await expect(getCampaignPage({ page: 0, perPage: PER_PAGE })).rejects.toThrow();
    expect(requests).toHaveLength(0);
  });

  it("契約の上限を 1 件超える件数は送る前に止める", async () => {
    const requests = serveJson(CAMPAIGNS_URL, { campaigns: [], total: 0 });

    await expect(
      getCampaignPage({ page: 1, perPage: getCampaignsQueryPerPageMax + 1 }),
    ).rejects.toThrow();
    expect(requests).toHaveLength(0);
  });

  it("役割が足りなければ、その分類のまま投げる", async () => {
    serveStatus("get", CAMPAIGNS_URL, 403);

    await expect(kindOf(() => getCampaignPage({ page: 1, perPage: PER_PAGE }))).resolves.toBe(
      ErrorKind.PERMISSION_DENIED,
    );
  });
});

describe("suspendCampaign", () => {
  const suspended = { ...wireCampaign, suspendedAt: "2026-10-05T03:00:00Z" };

  // ----- 正常系 -----
  it("受け取った識別子の停止の口を POST で叩く", async () => {
    const requests = serveWrite("post", SUSPEND_URL, suspended);

    await suspendCampaign(toCampaignId(CAMPAIGN_ID), "idempotency-key");

    expect(requests[0]?.url).toBe(`${CAMPAIGNS_URL}/${CAMPAIGN_ID}/suspend`);
    expect(requests[0]?.method).toBe("POST");
  });

  it("冪等キーをヘッダへ載せる", async () => {
    const requests = serveWrite("post", SUSPEND_URL, suspended);

    await suspendCampaign(toCampaignId(CAMPAIGN_ID), "idempotency-key");

    expect(requests[0]?.headers.get("Idempotency-Key")).toBe("idempotency-key");
  });

  // ----- 異常系 -----
  it("既に停止済みという拒否を、競合として分類する", async () => {
    serveStatus("post", SUSPEND_URL, 409);

    await expect(
      kindOf(() => suspendCampaign(toCampaignId(CAMPAIGN_ID), "idempotency-key")),
    ).resolves.toBe(ErrorKind.CONFLICT);
  });

  it("見つからなければ、その分類のまま投げる", async () => {
    serveStatus("post", SUSPEND_URL, 404);

    await expect(
      kindOf(() => suspendCampaign(toCampaignId(CAMPAIGN_ID), "idempotency-key")),
    ).resolves.toBe(ErrorKind.NOT_FOUND);
  });
});

describe("claimCampaignCoupon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAccessToken.mockResolvedValue("test-access-token");
  });

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
