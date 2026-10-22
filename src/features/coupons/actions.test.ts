import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { actionStateFromError, idleActionState } from "@/model/action-state";
import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";

const { claimCampaignCoupon, redirect, refresh } = vi.hoisted(() => ({
  claimCampaignCoupon: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  refresh: vi.fn(),
}));

vi.mock("next/cache", () => ({ refresh }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/adapters/server/api/campaigns", () => ({ claimCampaignCoupon }));

import { claimCouponAction } from "./actions";
import { CLAIM_CODE_FIELD } from "./form-names";

const KEY = "00000000-0000-4000-8000-000000000001";

const MALFORMED_MESSAGE = "受け取りを受け付けられませんでした。画面を読み込み直してください。";

function formOf(code: string, key = KEY): FormData {
  const formData = new FormData();

  formData.set(CLAIM_CODE_FIELD, code);
  formData.set(IDEMPOTENCY_KEY_FIELD, key);

  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  claimCampaignCoupon.mockReset().mockResolvedValue(undefined);
});

describe("claimCouponAction", () => {
  // ----- 正常系 -----
  it("解いたコードと冪等キーを受け取りへ渡す", async () => {
    await claimCouponAction(idleActionState(), formOf(" spring "));

    expect(claimCampaignCoupon).toHaveBeenCalledWith(" spring ", KEY);
  });

  it("成立したら一覧を取り直させ、成功を返す", async () => {
    const state = await claimCouponAction(idleActionState(), formOf("SPRING"));

    expect(state).toEqual({ status: "success", value: undefined });
    expect(refresh).toHaveBeenCalledOnce();
  });

  // ----- 異常系 -----
  it("認証が切れていたら、この画面へ戻る入り直しへ送る", async () => {
    claimCampaignCoupon.mockRejectedValue(createAppError(ErrorKind.UNAUTHENTICATED));

    await expect(claimCouponAction(idleActionState(), formOf("SPRING"))).rejects.toThrow(
      "NEXT_REDIRECT:/login?returnUrl=%2Fmypage%2Fcoupons",
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it("空のコードは送らず、コードの項目の文言として返す", async () => {
    const state = await claimCouponAction(idleActionState(), formOf(" "));

    expect(state).toMatchObject({
      status: "error",
      fieldErrors: { [CLAIM_CODE_FIELD]: ["キャンペーンコードを入力してください。"] },
    });
    expect(claimCampaignCoupon).not.toHaveBeenCalled();
  });

  it("冪等キーを解けない送信は送らず、読み込み直しへ導く", async () => {
    const state = await claimCouponAction(idleActionState(), formOf("SPRING", "broken"));

    expect(state).toEqual({
      status: "error",
      formError: MALFORMED_MESSAGE,
      fieldErrors: undefined,
      kind: undefined,
    });
    expect(claimCampaignCoupon).not.toHaveBeenCalled();
  });

  it.each([
    ["存在しないコード", createAppError(ErrorKind.VALIDATION, { cause: new Error("not found") })],
    ["上限に達したコード", createAppError(ErrorKind.VALIDATION, { cause: new Error("limit") })],
    ["包まれた拒否", new Error("wrapped", { cause: createAppError(ErrorKind.VALIDATION) })],
  ])("契約がコードを弾いたら、理由（%s）によらず同じ 1 つの文言を返す", async (_label, error) => {
    claimCampaignCoupon.mockRejectedValue(error);

    const state = await claimCouponAction(idleActionState(), formOf("SPRING"));

    expect(state).toEqual({
      status: "error",
      formError: null,
      fieldErrors: {
        [CLAIM_CODE_FIELD]: ["このコードでは受け取れません。コードを確かめてください。"],
      },
      kind: ErrorKind.VALIDATION,
    });
  });

  it("同じ受け取りが処理中なら、待ってから送り直すよう促す", async () => {
    claimCampaignCoupon.mockRejectedValue(createAppError(ErrorKind.CONFLICT));

    const state = await claimCouponAction(idleActionState(), formOf("SPRING"));

    expect(state).toEqual({
      status: "error",
      formError:
        "受け取りの処理が終わっていません。少し待ってから一覧を確かめ、もう一度お試しください。",
      fieldErrors: undefined,
      kind: ErrorKind.CONFLICT,
    });
  });

  it("契約が要求を読めなかったら、読み込み直しへ導く", async () => {
    claimCampaignCoupon.mockRejectedValue(createAppError(ErrorKind.INVALID_ARGUMENT));

    const state = await claimCouponAction(idleActionState(), formOf("SPRING"));

    expect(state).toEqual({
      status: "error",
      formError: MALFORMED_MESSAGE,
      fieldErrors: undefined,
      kind: ErrorKind.INVALID_ARGUMENT,
    });
  });

  it("ほかの失敗は分類のまま返す", async () => {
    const error = createAppError(ErrorKind.UNAVAILABLE);

    claimCampaignCoupon.mockRejectedValue(error);

    const state = await claimCouponAction(idleActionState(), formOf("SPRING"));

    expect(state).toEqual(actionStateFromError(error));
    expect(state).toMatchObject({ kind: ErrorKind.UNAVAILABLE });
  });

  it("通らなかった受け取りでは、一覧を取り直させない", async () => {
    claimCampaignCoupon.mockRejectedValue(createAppError(ErrorKind.VALIDATION));

    await claimCouponAction(idleActionState(), formOf("SPRING"));

    expect(refresh).not.toHaveBeenCalled();
  });
});
