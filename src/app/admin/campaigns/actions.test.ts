import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError } from "@/errors/app-error";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";
import { withErrorDetails } from "@/errors/error-meta";
import {
  SUSPEND_CONFLICT_MESSAGE,
  SUSPEND_TARGET_LOST_MESSAGE,
} from "@/features/admin/campaigns/list/form-state";
import { CAMPAIGN_CODE_INVALID_MESSAGE } from "@/features/admin/campaigns/new/campaign-rules";
import {
  CAMPAIGN_CODE_CONFLICT_MESSAGE,
  CAMPAIGN_TARGET_LOST_MESSAGE,
} from "@/features/admin/campaigns/new/form-state";
import { ADMIN_CAMPAIGN_LIST_PATH, ADMIN_CAMPAIGN_NEW_PATH } from "@/features/admin/paths";
import { loginPath } from "@/features/auth/facade/paths";
import { idleActionState } from "@/model/action-state";
import { toCampaignId } from "@/model/campaign/campaign";
import { SESSION_ROLE, type Session, type SessionRole } from "@/model/session";

const {
  createCampaign,
  redirect,
  refresh,
  revalidatePath,
  suspendCampaign,
  unstable_rethrow,
  verifySession,
} = vi.hoisted(() => ({
  createCampaign: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  refresh: vi.fn(),
  revalidatePath: vi.fn(),
  suspendCampaign: vi.fn(),
  unstable_rethrow: vi.fn((error: unknown) => {
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT:")) {
      throw error;
    }
  }),
  verifySession: vi.fn<() => Promise<Session | null>>(),
}));

vi.mock("next/navigation", () => ({ redirect, unstable_rethrow }));
vi.mock("next/cache", () => ({ refresh, revalidatePath }));
vi.mock("@/adapters/server/auth/session", () => ({ verifySession }));
vi.mock("@/adapters/server/api/campaigns", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/campaigns")>()),
  createCampaign,
  suspendCampaign,
}));

import { createCampaignAction, suspendCampaignAction } from "./actions";

const CAMPAIGN_ID = "0195f0c2-0000-7000-9000-0000000000c1";
const CAMPAIGN_CODE = "SPRING2026";
const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-9000-0000000000f1";

function session(role: SessionRole): Session {
  return {
    userId: "0195f0c2-0000-7000-9000-0000000000a1",
    role,
    expiresAt: new Date("2099-01-01T00:00:00.000Z"),
  };
}

function suspendForm(overrides: Readonly<Record<string, string | null>> = {}): FormData {
  const form = new FormData();
  const values: Record<string, string | null> = {
    campaignId: CAMPAIGN_ID,
    campaignCode: CAMPAIGN_CODE,
    idempotencyKey: IDEMPOTENCY_KEY,
    ...overrides,
  };

  for (const [key, value] of Object.entries(values)) {
    if (value !== null) form.append(key, value);
  }

  return form;
}

function campaignForm(overrides: Readonly<Record<string, string | null>> = {}): FormData {
  const form = new FormData();
  const values: Record<string, string | null> = {
    code: " welcome-2026 ",
    startsAt: "2026-10-01T00:00:00.000Z",
    endsAt: "2026-11-30T23:59:00.000Z",
    couponExpiresAt: "2026-12-31T23:59:00.000Z",
    usableFrom: "",
    totalLimit: "1000",
    perUserLimit: "1",
    minPurchaseAmount: "50",
    discountKind: "rate",
    discountValue: "15",
    discountMaxAmount: "20",
    scopeKind: "all",
    confirmed: "true",
    idempotencyKey: IDEMPOTENCY_KEY,
    ...overrides,
  };

  for (const [key, value] of Object.entries(values)) {
    if (value !== null) form.append(key, value);
  }

  return form;
}

function rejectedWithDetails(details: readonly string[]): Error {
  return createAppError(ErrorKind.VALIDATION, {
    cause: withErrorDetails(new Error("拒否"), details),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  verifySession.mockResolvedValue(session(SESSION_ROLE.admin));
  suspendCampaign.mockResolvedValue(undefined);
  createCampaign.mockResolvedValue(undefined);
});

describe("suspendCampaignAction", () => {
  // ----- 正常系 -----
  it("成立したら、いまの画面を取り直させる", async () => {
    await suspendCampaignAction(idleActionState(), suspendForm());

    expect(refresh).toHaveBeenCalledOnce();
  });

  it("成立したら、対象のコードを載せた成功の状態を返す", async () => {
    const state = await suspendCampaignAction(idleActionState(), suspendForm());

    expect(state).toEqual({ status: "success", value: { code: CAMPAIGN_CODE } });
  });

  it("受け取った識別子と冪等キーをそのまま渡して停止させる", async () => {
    await suspendCampaignAction(idleActionState(), suspendForm());

    expect(suspendCampaign).toHaveBeenCalledWith(toCampaignId(CAMPAIGN_ID), IDEMPOTENCY_KEY);
  });

  // ----- 異常系 -----
  it("管理の役割を持たない session なら、送らずに PERMISSION_DENIED で拒む", async () => {
    verifySession.mockResolvedValue(session(SESSION_ROLE.user));

    const state = await suspendCampaignAction(idleActionState(), suspendForm());

    expect(state).toMatchObject({ status: "error", kind: ErrorKind.PERMISSION_DENIED });
    expect(suspendCampaign).not.toHaveBeenCalled();
  });

  it("未認証なら、送らずにこの一覧へ戻る入り直しへ送る", async () => {
    verifySession.mockResolvedValue(null);

    await expect(suspendCampaignAction(idleActionState(), suspendForm())).rejects.toThrow(
      `NEXT_REDIRECT:${loginPath(ADMIN_CAMPAIGN_LIST_PATH)}`,
    );
    expect(suspendCampaign).not.toHaveBeenCalled();
  });

  it.each([
    { name: "識別子が届かない", overrides: { campaignId: null } },
    { name: "識別子が空", overrides: { campaignId: "" } },
  ])("$name なら、開き直す案内を返して送らない", async ({ overrides }) => {
    const state = await suspendCampaignAction(idleActionState(), suspendForm(overrides));

    expect(state).toMatchObject({ status: "error", formError: SUSPEND_TARGET_LOST_MESSAGE });
    expect(suspendCampaign).not.toHaveBeenCalled();
  });

  it.each([
    { name: "コードが届かない", overrides: { campaignCode: null } },
    { name: "コードが空", overrides: { campaignCode: "" } },
  ])("$name なら、結果の文言を組めないので同じく送らない", async ({ overrides }) => {
    const state = await suspendCampaignAction(idleActionState(), suspendForm(overrides));

    expect(state).toMatchObject({ status: "error", formError: SUSPEND_TARGET_LOST_MESSAGE });
    expect(suspendCampaign).not.toHaveBeenCalled();
  });

  it("冪等キーが届かなければ送らない", async () => {
    const state = await suspendCampaignAction(
      idleActionState(),
      suspendForm({ idempotencyKey: null }),
    );

    expect(state).toMatchObject({ status: "error", formError: SUSPEND_TARGET_LOST_MESSAGE });
    expect(suspendCampaign).not.toHaveBeenCalled();
  });

  it("冪等キーが UUID の形でなければ送らない", async () => {
    const state = await suspendCampaignAction(
      idleActionState(),
      suspendForm({ idempotencyKey: "not-a-uuid" }),
    );

    expect(state).toMatchObject({ status: "error", formError: SUSPEND_TARGET_LOST_MESSAGE });
    expect(suspendCampaign).not.toHaveBeenCalled();
  });

  it("既に停止されていて 409 で拒まれたら、コードを添えた競合の文言を返し、一覧も取り直させる", async () => {
    suspendCampaign.mockRejectedValue(createAppError(ErrorKind.CONFLICT));

    const state = await suspendCampaignAction(idleActionState(), suspendForm());

    expect(state).toMatchObject({
      status: "error",
      kind: ErrorKind.CONFLICT,
      formError: `${CAMPAIGN_CODE} は${SUSPEND_CONFLICT_MESSAGE}`,
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("接続先が認証切れで拒んだら、取り直させずにこの一覧へ戻る入り直しへ送る", async () => {
    suspendCampaign.mockRejectedValue(createAppError(ErrorKind.UNAUTHENTICATED));

    await expect(suspendCampaignAction(idleActionState(), suspendForm())).rejects.toThrow(
      `NEXT_REDIRECT:${loginPath(ADMIN_CAMPAIGN_LIST_PATH)}`,
    );
    expect(suspendCampaign).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("409 以外の分類で拒まれたら、分類の既定の文言を返し、一覧は取り直させない", async () => {
    suspendCampaign.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    const state = await suspendCampaignAction(idleActionState(), suspendForm());

    expect(state).toMatchObject({
      status: "error",
      kind: ErrorKind.UNAVAILABLE,
      formError: getDefaultErrorMeta(ErrorKind.UNAVAILABLE).message,
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("分類の無い例外で失敗したら、internal として返す", async () => {
    suspendCampaign.mockRejectedValue(new Error("unexpected"));

    const state = await suspendCampaignAction(idleActionState(), suspendForm());

    expect(state).toMatchObject({
      status: "error",
      kind: ErrorKind.INTERNAL,
      formError: getDefaultErrorMeta(ErrorKind.INTERNAL).message,
    });
  });
});

describe("createCampaignAction", () => {
  // ----- 正常系 -----
  it("読めた定義と冪等キーをそのまま渡して作らせる", async () => {
    await expect(createCampaignAction(idleActionState(), campaignForm())).rejects.toThrow();

    expect(createCampaign).toHaveBeenCalledWith(
      {
        code: "WELCOME-2026",
        discount: { kind: "rate", value: "0.15", maxAmount: 2000 },
        scope: { kind: "all" },
        minPurchaseAmount: 5000,
        usableFrom: null,
        couponExpiresAt: new Date("2026-12-31T23:59:00.000Z"),
        startsAt: new Date("2026-10-01T00:00:00.000Z"),
        endsAt: new Date("2026-11-30T23:59:00.000Z"),
        totalLimit: 1000,
        perUserLimit: 1,
      },
      IDEMPOTENCY_KEY,
    );
  });

  it("成立したら、一覧を取り直させてから一覧へ送る", async () => {
    await expect(createCampaignAction(idleActionState(), campaignForm())).rejects.toThrow(
      `NEXT_REDIRECT:${ADMIN_CAMPAIGN_LIST_PATH}`,
    );

    expect(revalidatePath).toHaveBeenCalledWith(ADMIN_CAMPAIGN_LIST_PATH);
    expect(revalidatePath.mock.invocationCallOrder[0]).toBeLessThan(
      redirect.mock.invocationCallOrder[0] ?? 0,
    );
  });

  // ----- 異常系 -----
  it("管理の役割を持たない session なら、送らずに PERMISSION_DENIED で拒む", async () => {
    verifySession.mockResolvedValue(session(SESSION_ROLE.user));

    const state = await createCampaignAction(idleActionState(), campaignForm());

    expect(state).toMatchObject({ status: "error", kind: ErrorKind.PERMISSION_DENIED });
    expect(createCampaign).not.toHaveBeenCalled();
  });

  it("未認証なら、送らずに作成画面へ戻る入り直しへ送る", async () => {
    verifySession.mockResolvedValue(null);

    await expect(createCampaignAction(idleActionState(), campaignForm())).rejects.toThrow(
      `NEXT_REDIRECT:${loginPath(ADMIN_CAMPAIGN_NEW_PATH)}`,
    );
    expect(createCampaign).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    { name: "冪等キーが届かない", overrides: { idempotencyKey: null } },
    { name: "冪等キーが UUID の形でない", overrides: { idempotencyKey: "not-a-uuid" } },
    { name: "確認を通った合図が届かない", overrides: { confirmed: null } },
  ])("$name なら、開き直す案内を返して送らない", async ({ overrides }) => {
    const state = await createCampaignAction(idleActionState(), campaignForm(overrides));

    expect(state).toMatchObject({ status: "error", formError: CAMPAIGN_TARGET_LOST_MESSAGE });
    expect(createCampaign).not.toHaveBeenCalled();
  });

  it("読めない入力は、全体の文言を出さずに項目ごとに返して送らない", async () => {
    const state = await createCampaignAction(idleActionState(), campaignForm({ code: "" }));

    expect(state).toMatchObject({
      status: "error",
      formError: null,
      fieldErrors: { code: [CAMPAIGN_CODE_INVALID_MESSAGE] },
    });
    expect(createCampaign).not.toHaveBeenCalled();
  });

  it("接続先が認証切れで拒んだら、取り直させずに作成画面へ戻る入り直しへ送る", async () => {
    createCampaign.mockRejectedValue(createAppError(ErrorKind.UNAUTHENTICATED));

    await expect(createCampaignAction(idleActionState(), campaignForm())).rejects.toThrow(
      `NEXT_REDIRECT:${loginPath(ADMIN_CAMPAIGN_NEW_PATH)}`,
    );
    expect(createCampaign).toHaveBeenCalledTimes(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("409 で拒まれたら、コードの欄へ重複の文言を返し、一覧は取り直させない", async () => {
    createCampaign.mockRejectedValue(createAppError(ErrorKind.CONFLICT));

    const state = await createCampaignAction(idleActionState(), campaignForm());

    expect(state).toEqual({
      status: "error",
      kind: ErrorKind.CONFLICT,
      formError: null,
      fieldErrors: { code: [CAMPAIGN_CODE_CONFLICT_MESSAGE] },
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("接続先がこの画面の欄を名指しして拒んだら、その欄あてに返し、全体の文言は出さない", async () => {
    createCampaign.mockRejectedValue(rejectedWithDetails(["totalLimit", "perUserLimit"]));

    const state = await createCampaignAction(idleActionState(), campaignForm());

    expect(state).toEqual({
      status: "error",
      kind: ErrorKind.VALIDATION,
      formError: null,
      fieldErrors: {
        totalLimit: ["総枚数の上限は受け付けられませんでした。入力し直してください。"],
        perUserLimit: ["1 人あたりの上限は受け付けられませんでした。入力し直してください。"],
      },
    });
  });

  it("名指しにこの画面の欄でない名前が混ざっていたら、読める欄だけを返す", async () => {
    createCampaign.mockRejectedValue(rejectedWithDetails(["code", "discount.value"]));

    const state = await createCampaignAction(idleActionState(), campaignForm());

    expect(state).toEqual({
      status: "error",
      kind: ErrorKind.VALIDATION,
      formError: null,
      fieldErrors: {
        code: ["キャンペーンコードは受け付けられませんでした。入力し直してください。"],
      },
    });
  });

  it.each([
    { name: "欄を名指しせずに", error: createAppError(ErrorKind.VALIDATION) },
    {
      name: "この画面の欄でない名前だけを名指しして",
      error: rejectedWithDetails(["discount.value"]),
    },
  ])("接続先が$name拒んだら、組み合わせを見直す全体の文言を返す", async ({ error }) => {
    createCampaign.mockRejectedValue(error);

    const state = await createCampaignAction(idleActionState(), campaignForm());

    expect(state).toEqual({
      status: "error",
      kind: ErrorKind.VALIDATION,
      formError:
        "入力内容を受け付けられませんでした。期間・上限・値引きの組み合わせを確認してください。",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("409 と 422 以外の分類で拒まれたら、分類の既定の文言を返す", async () => {
    createCampaign.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    const state = await createCampaignAction(idleActionState(), campaignForm());

    expect(state).toMatchObject({
      status: "error",
      kind: ErrorKind.UNAVAILABLE,
      formError: getDefaultErrorMeta(ErrorKind.UNAVAILABLE).message,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("分類の無い例外で失敗したら、internal として返す", async () => {
    createCampaign.mockRejectedValue(new Error("unexpected"));

    const state = await createCampaignAction(idleActionState(), campaignForm());

    expect(state).toMatchObject({
      status: "error",
      kind: ErrorKind.INTERNAL,
      formError: getDefaultErrorMeta(ErrorKind.INTERNAL).message,
    });
  });
});
