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

import type { CampaignDraft } from "@/model/campaign/campaign-draft";
import { toProductCategoryId, toProductId } from "@/model/product/product";
import { createCampaign } from "./campaigns";

const CAMPAIGNS_URL = `${PARSED_ENVIRONMENT.APP_API_BASE_URL}/v1/campaigns`;

/** 契約が返す定義済みのキャンペーン。写さないので形が通れば足りる。 */
const wireCampaign = {
  id: "0193a1c0-0002-7000-8000-000000000003",
  code: "WELCOME-2026",
  discount: { kind: "rate", value: "0.15", maxAmount: 2000 },
  scope: { kind: "all", targetId: null },
  minPurchaseAmount: 5000,
  usableFrom: null,
  couponExpiresAt: "2026-12-31T14:59:59Z",
  startsAt: "2026-10-01T00:00:00Z",
  endsAt: "2026-11-30T14:59:59Z",
  totalLimit: 1000,
  perUserLimit: 1,
  issuedCount: 0,
  suspendedAt: null,
};

const draft: CampaignDraft = {
  code: "WELCOME-2026",
  discount: { kind: "rate", value: "0.15", maxAmount: 2000 },
  scope: { kind: "all" },
  minPurchaseAmount: 5000,
  usableFrom: new Date("2026-10-05T00:00:00Z"),
  couponExpiresAt: new Date("2026-12-31T14:59:59Z"),
  startsAt: new Date("2026-10-01T00:00:00Z"),
  endsAt: new Date("2026-11-30T14:59:59Z"),
  totalLimit: 1000,
  perUserLimit: 1,
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

beforeEach(() => {
  getAccessToken.mockResolvedValue("access-token");
});

describe("createCampaign", () => {
  // ----- 正常系 -----
  it("定義する内容を、日時を瞬間の文字列にして本文で送る", async () => {
    const requests = serveWrite("post", CAMPAIGNS_URL, wireCampaign);

    await createCampaign(draft, "idempotency-key");

    await expect(requests[0]?.json()).resolves.toEqual({
      code: "WELCOME-2026",
      discount: { kind: "rate", value: "0.15", maxAmount: 2000 },
      scope: { kind: "all", targetId: null },
      minPurchaseAmount: 5000,
      usableFrom: "2026-10-05T00:00:00.000Z",
      couponExpiresAt: "2026-12-31T14:59:59.000Z",
      startsAt: "2026-10-01T00:00:00.000Z",
      endsAt: "2026-11-30T14:59:59.000Z",
      totalLimit: 1000,
      perUserLimit: 1,
    });
  });

  it("任意の最低購入額と利用開始が無ければ null で送る", async () => {
    const requests = serveWrite("post", CAMPAIGNS_URL, wireCampaign);

    await createCampaign({ ...draft, minPurchaseAmount: null, usableFrom: null }, "key");

    const body = await requests[0]?.json();

    expect(body.minPurchaseAmount).toBeNull();
    expect(body.usableFrom).toBeNull();
  });

  it("定額の値引きには上限の欄を載せない", async () => {
    const requests = serveWrite("post", CAMPAIGNS_URL, wireCampaign);

    await createCampaign({ ...draft, discount: { kind: "flat", value: "5.00" } }, "key");

    const body = await requests[0]?.json();

    expect(body.discount).toEqual({ kind: "flat", value: "5.00" });
  });

  it("定率の上限が無ければ null で送る", async () => {
    const requests = serveWrite("post", CAMPAIGNS_URL, wireCampaign);

    await createCampaign(
      { ...draft, discount: { kind: "rate", value: "0.10", maxAmount: null } },
      "key",
    );

    const body = await requests[0]?.json();

    expect(body.discount).toEqual({ kind: "rate", value: "0.10", maxAmount: null });
  });

  it.each([
    {
      label: "カテゴリ",
      scope: {
        kind: "category",
        categoryId: toProductCategoryId("5dd52d84-78eb-4a52-ba0b-2e11c95c2af2"),
      },
      wire: { kind: "category", targetId: "5dd52d84-78eb-4a52-ba0b-2e11c95c2af2" },
    },
    {
      label: "商品",
      scope: { kind: "product", productId: toProductId("0f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b11") },
      wire: { kind: "product", targetId: "0f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b11" },
    },
  ] as const)("$label に絞る範囲は、その識別子を対象として送る", async ({ scope, wire }) => {
    const requests = serveWrite("post", CAMPAIGNS_URL, wireCampaign);

    await createCampaign({ ...draft, scope }, "key");

    const body = await requests[0]?.json();

    expect(body.scope).toEqual(wire);
  });

  it("冪等キーをヘッダへ載せる", async () => {
    const requests = serveWrite("post", CAMPAIGNS_URL, wireCampaign);

    await createCampaign(draft, "idempotency-key");

    expect(requests[0]?.headers.get("Idempotency-Key")).toBe("idempotency-key");
  });

  // ----- 異常系 -----
  it("コードが既に使われているという拒否を、競合として分類する", async () => {
    serveStatus("post", CAMPAIGNS_URL, 409);

    await expect(kindOf(() => createCampaign(draft, "key"))).resolves.toBe(ErrorKind.CONFLICT);
  });

  it("内容が条件を満たさないという拒否を、入力の誤りとして分類する", async () => {
    serveStatus("post", CAMPAIGNS_URL, 422);

    await expect(kindOf(() => createCampaign(draft, "key"))).resolves.toBe(ErrorKind.VALIDATION);
  });
});
