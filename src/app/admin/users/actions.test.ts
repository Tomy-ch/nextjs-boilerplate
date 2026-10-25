import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError } from "@/errors/app-error";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";
import { withErrorDetails } from "@/errors/error-meta";
import { ADMIN_USER_LIST_PATH, adminUserCouponNewPath } from "@/features/admin/paths";
import {
  ISSUE_RECIPIENT_LOST_MESSAGE,
  ISSUE_RESEND_CONFLICT_MESSAGE,
  ISSUE_SCOPE_CATEGORY_LOST_MESSAGE,
  ISSUE_SCOPE_PRODUCT_LOST_MESSAGE,
  ISSUE_TARGET_LOST_MESSAGE,
  ISSUE_TARGET_UNKNOWN_MESSAGE,
} from "@/features/admin/users/coupon-new/form-state";
import { ISSUE_EXPIRES_AT_MISSING_MESSAGE } from "@/features/admin/users/coupon-new/issue-rules";
import { WITHDRAW_CONFLICT_MESSAGE } from "@/features/admin/users/list/form-state";
import { loginPath } from "@/features/auth/facade/paths";
import { idleActionState } from "@/model/action-state";
import { SESSION_ROLE } from "@/model/session";
import { toUserId } from "@/model/user/user";

const { getManagedUser, issueCoupon, redirect, unstable_rethrow, verifySession, withdrawUser } =
  vi.hoisted(() => ({
    getManagedUser: vi.fn(),
    issueCoupon: vi.fn(),
    redirect: vi.fn((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    }),
    unstable_rethrow: vi.fn((error: unknown) => {
      if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT:")) {
        throw error;
      }
    }),
    verifySession: vi.fn(),
    withdrawUser: vi.fn(),
  }));

vi.mock("next/navigation", () => ({ redirect, unstable_rethrow }));
vi.mock("@/adapters/server/auth/session", () => ({ verifySession }));
vi.mock("@/adapters/server/api/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/users")>()),
  getManagedUser,
  withdrawUser,
}));
vi.mock("@/adapters/server/api/coupons", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/coupons")>()),
  issueCoupon,
}));

import { issueUserCouponAction, withdrawUserAction } from "./actions";

const USER_ID = "0195f0c2-0000-7000-8000-000000000001";
const USER_NAME = "山田 太郎";
const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-8000-0000000000f1";
const CATEGORY_ID = "0195f0c2-0000-7000-8000-0000000000c1";
const PRODUCT_ID = "0195f0c2-0000-7000-8000-0000000000d1";
const ISSUE_SCREEN_PATH = adminUserCouponNewPath(toUserId(USER_ID));
const INVALID_INPUT_MESSAGE =
  "入力内容を受け付けられませんでした。値引き・対象・期限の組み合わせを確認してください。";

/** 形の上で通る最小の入力。個々のケースは、ここから 1 項目だけ崩す。 */
function withdrawForm(overrides: Readonly<Record<string, string>> = {}): FormData {
  const form = new FormData();
  const values: Record<string, string> = {
    userId: USER_ID,
    userName: USER_NAME,
    ...overrides,
  };

  for (const [key, value] of Object.entries(values)) {
    if (value !== "") form.append(key, value);
  }

  return form;
}

function issueForm(overrides: Readonly<Record<string, string | null>> = {}): FormData {
  const form = new FormData();
  const values: Record<string, string | null> = {
    userId: USER_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
    confirmed: "true",
    expiresAt: "2026-12-31T23:59:00.000Z",
    usableFrom: "",
    minPurchaseAmount: "50",
    discountKind: "rate",
    discountValue: "15",
    discountMaxAmount: "20",
    scopeKind: "all",
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

const CATEGORY_SCOPE = { scopeKind: "category", scopeCategoryId: CATEGORY_ID };

beforeEach(() => {
  vi.clearAllMocks();
  verifySession.mockResolvedValue({ subject: "admin", role: SESSION_ROLE.admin });
  issueCoupon.mockResolvedValue(undefined);
});

describe("withdrawUserAction", () => {
  // ----- 正常系 -----
  it("受け取った識別子の利用者を退会させる", async () => {
    await withdrawUserAction(idleActionState(), withdrawForm());

    expect(withdrawUser).toHaveBeenCalledWith(USER_ID);
  });

  it("成立したら、結果に対象の呼び名を載せて返す", async () => {
    const state = await withdrawUserAction(idleActionState(), withdrawForm());

    expect(state).toEqual({ status: "success", value: { name: USER_NAME } });
  });

  // ----- 異常系 -----
  it("session が無ければ、送らずにこの画面へ戻る入り直しへ送る", async () => {
    verifySession.mockResolvedValue(null);

    await expect(withdrawUserAction(idleActionState(), withdrawForm())).rejects.toThrow(
      `NEXT_REDIRECT:${loginPath(ADMIN_USER_LIST_PATH)}`,
    );
    expect(withdrawUser).not.toHaveBeenCalled();
  });

  it("役割が足りなければ送らずに拒む", async () => {
    verifySession.mockResolvedValue({ subject: "user", role: SESSION_ROLE.user });

    const state = await withdrawUserAction(idleActionState(), withdrawForm());

    expect(state).toMatchObject({ status: "error", kind: ErrorKind.PERMISSION_DENIED });
    expect(withdrawUser).not.toHaveBeenCalled();
  });

  it("対象が届かなければ、開き直す案内を返して送らない", async () => {
    const state = await withdrawUserAction(idleActionState(), withdrawForm({ userId: "" }));

    expect(state).toMatchObject({
      status: "error",
      formError: "対象の利用者が判りません。画面を開き直してください。",
    });
    expect(withdrawUser).not.toHaveBeenCalled();
  });

  it("呼び名が届かなければ、結果の文言を組めないので同じく送らない", async () => {
    const state = await withdrawUserAction(idleActionState(), withdrawForm({ userName: "" }));

    expect(state).toMatchObject({
      status: "error",
      formError: "対象の利用者が判りません。画面を開き直してください。",
    });
    expect(withdrawUser).not.toHaveBeenCalled();
  });

  it("進行中の購入が残って拒まれたら、対象の呼び名を添えた理由を返す", async () => {
    withdrawUser.mockRejectedValue(createAppError(ErrorKind.CONFLICT));

    const state = await withdrawUserAction(idleActionState(), withdrawForm());

    expect(state).toMatchObject({
      status: "error",
      kind: ErrorKind.CONFLICT,
      formError: `${USER_NAME} は${WITHDRAW_CONFLICT_MESSAGE}`,
    });
  });

  it("接続先が認証切れで拒んだら、この画面へ戻る入り直しへ送る", async () => {
    withdrawUser.mockRejectedValue(createAppError(ErrorKind.UNAUTHENTICATED));

    await expect(withdrawUserAction(idleActionState(), withdrawForm())).rejects.toThrow(
      `NEXT_REDIRECT:${loginPath(ADMIN_USER_LIST_PATH)}`,
    );
    expect(withdrawUser).toHaveBeenCalledTimes(1);
  });

  it("競合以外の失敗は、分類ごとの既定の文言で返す", async () => {
    withdrawUser.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    const state = await withdrawUserAction(idleActionState(), withdrawForm());

    expect(state).toMatchObject({ status: "error", kind: ErrorKind.UNAVAILABLE });
    expect(state).not.toMatchObject({ formError: expect.stringContaining(USER_NAME) });
  });
});

describe("issueUserCouponAction", () => {
  // ----- 正常系 -----
  it("成立したら、値を持たない成功の状態を返し、どこへも送らない", async () => {
    const state = await issueUserCouponAction(idleActionState(), issueForm());

    expect(state).toEqual({ status: "success", value: undefined });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("隠し項目で受け取った宛先を、そのまま宛先として渡す", async () => {
    await issueUserCouponAction(idleActionState(), issueForm());

    expect(issueCoupon).toHaveBeenCalledWith(
      toUserId(USER_ID),
      expect.anything(),
      expect.anything(),
    );
  });

  it("読めた発行内容を、そのまま発行内容として渡す", async () => {
    await issueUserCouponAction(idleActionState(), issueForm());

    expect(issueCoupon).toHaveBeenCalledWith(
      expect.anything(),
      {
        discount: { kind: "rate", value: "0.15", maxAmount: 2000 },
        scope: { kind: "all" },
        minPurchaseAmount: 5000,
        usableFrom: null,
        expiresAt: new Date("2026-12-31T23:59:00.000Z"),
      },
      expect.anything(),
    );
  });

  it("受け取った冪等キーを、そのまま冪等キーとして渡す", async () => {
    await issueUserCouponAction(idleActionState(), issueForm());

    expect(issueCoupon).toHaveBeenCalledWith(expect.anything(), expect.anything(), IDEMPOTENCY_KEY);
  });

  // ----- 異常系 -----
  it("管理の役割を持たない session なら、送信が崩れていても先に PERMISSION_DENIED で拒み、何も読み書きしない", async () => {
    verifySession.mockResolvedValue({ subject: "user", role: SESSION_ROLE.user });

    const state = await issueUserCouponAction(idleActionState(), issueForm({ confirmed: null }));

    expect(state).toMatchObject({ status: "error", kind: ErrorKind.PERMISSION_DENIED });
    expect(issueCoupon).not.toHaveBeenCalled();
    expect(getManagedUser).not.toHaveBeenCalled();
  });

  it("session が無ければ、送らずにこの利用者の発行画面へ戻る入り直しへ送る", async () => {
    verifySession.mockResolvedValue(null);

    await expect(issueUserCouponAction(idleActionState(), issueForm())).rejects.toThrow(
      `NEXT_REDIRECT:${loginPath(ISSUE_SCREEN_PATH)}`,
    );
    expect(issueCoupon).not.toHaveBeenCalled();
  });

  it("宛先が読めずに session も無ければ、利用者の一覧へ戻る入り直しへ送る", async () => {
    verifySession.mockResolvedValue(null);

    await expect(
      issueUserCouponAction(idleActionState(), issueForm({ userId: "not-a-uuid" })),
    ).rejects.toThrow(`NEXT_REDIRECT:${loginPath(ADMIN_USER_LIST_PATH)}`);
    expect(issueCoupon).not.toHaveBeenCalled();
  });

  it("宛先の隠し項目が UUID の形でなければ、項目ごとの文言を付けずに開き直す案内を返して送らない", async () => {
    const state = await issueUserCouponAction(
      idleActionState(),
      issueForm({ userId: "not-a-uuid" }),
    );

    expect(state).toEqual({ status: "error", formError: ISSUE_TARGET_LOST_MESSAGE });
    expect(issueCoupon).not.toHaveBeenCalled();
  });

  it.each<{ name: string; overrides: Readonly<Record<string, string | null>> }>([
    { name: "冪等キーが届かない", overrides: { idempotencyKey: null } },
    { name: "冪等キーが UUID の形でない", overrides: { idempotencyKey: "not-a-uuid" } },
  ])("$name なら、開き直す案内を返して送らない", async ({ overrides }) => {
    const state = await issueUserCouponAction(idleActionState(), issueForm(overrides));

    expect(state).toMatchObject({ status: "error", formError: ISSUE_TARGET_LOST_MESSAGE });
    expect(issueCoupon).not.toHaveBeenCalled();
  });

  it("確認を通った合図が届かなければ、開き直す案内を返して送らない", async () => {
    const state = await issueUserCouponAction(idleActionState(), issueForm({ confirmed: null }));

    expect(state).toMatchObject({ status: "error", formError: ISSUE_TARGET_LOST_MESSAGE });
    expect(issueCoupon).not.toHaveBeenCalled();
  });

  it("読めない入力は、全体の文言を出さずに項目ごとに返して送らない", async () => {
    const state = await issueUserCouponAction(idleActionState(), issueForm({ expiresAt: null }));

    expect(state).toEqual({
      status: "error",
      formError: null,
      fieldErrors: { expiresAt: [ISSUE_EXPIRES_AT_MISSING_MESSAGE] },
    });
    expect(issueCoupon).not.toHaveBeenCalled();
  });

  it("接続先が認証切れで拒んだら、宛先を読み直さずにこの画面へ戻る入り直しへ送る", async () => {
    issueCoupon.mockRejectedValue(createAppError(ErrorKind.UNAUTHENTICATED));

    await expect(issueUserCouponAction(idleActionState(), issueForm())).rejects.toThrow(
      `NEXT_REDIRECT:${loginPath(ISSUE_SCREEN_PATH)}`,
    );
    expect(getManagedUser).not.toHaveBeenCalled();
  });

  it("409 で拒まれたら、同じ内容で送り直す案内を競合の分類で返す", async () => {
    issueCoupon.mockRejectedValue(createAppError(ErrorKind.CONFLICT));

    const state = await issueUserCouponAction(idleActionState(), issueForm());

    expect(state).toEqual({
      status: "error",
      kind: ErrorKind.CONFLICT,
      formError: ISSUE_RESEND_CONFLICT_MESSAGE,
    });
  });

  it("接続先がこの画面の欄を名指しして拒んだら、その欄あてに返し、全体の文言は出さない", async () => {
    issueCoupon.mockRejectedValue(rejectedWithDetails(["expiresAt"]));

    const state = await issueUserCouponAction(idleActionState(), issueForm());

    expect(state).toEqual({
      status: "error",
      kind: ErrorKind.VALIDATION,
      formError: null,
      fieldErrors: {
        expiresAt: ["有効期限は受け付けられませんでした。入力し直してください。"],
      },
    });
  });

  it("名指しにこの画面の欄でない名前が混ざっていたら、読める欄だけを返す", async () => {
    issueCoupon.mockRejectedValue(rejectedWithDetails(["minPurchaseAmount", "discountValue"]));

    const state = await issueUserCouponAction(idleActionState(), issueForm());

    expect(state).toEqual({
      status: "error",
      kind: ErrorKind.VALIDATION,
      formError: null,
      fieldErrors: {
        minPurchaseAmount: ["最低購入額は受け付けられませんでした。入力し直してください。"],
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
    issueCoupon.mockRejectedValue(error);

    const state = await issueUserCouponAction(idleActionState(), issueForm());

    expect(state).toEqual({
      status: "error",
      kind: ErrorKind.VALIDATION,
      formError: INVALID_INPUT_MESSAGE,
    });
  });

  it("対象が全商品のまま 404 で拒まれたら、宛先を読み直さずに宛先が失われた文言を返す", async () => {
    issueCoupon.mockRejectedValue(createAppError(ErrorKind.NOT_FOUND));

    const state = await issueUserCouponAction(idleActionState(), issueForm());

    expect(state).toEqual({
      status: "error",
      kind: ErrorKind.NOT_FOUND,
      formError: null,
      fieldErrors: { userId: [ISSUE_RECIPIENT_LOST_MESSAGE] },
    });
    expect(getManagedUser).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "カテゴリ",
      overrides: CATEGORY_SCOPE,
      fieldErrors: { scopeCategoryId: [ISSUE_SCOPE_CATEGORY_LOST_MESSAGE] },
    },
    {
      name: "商品",
      overrides: { scopeKind: "product", scopeProductId: PRODUCT_ID },
      fieldErrors: { scopeProductId: [ISSUE_SCOPE_PRODUCT_LOST_MESSAGE] },
    },
  ])(
    "対象を$nameに絞って 404 で拒まれ、宛先が残っていれば、その対象の欄へ失われた文言を返す",
    async ({ overrides, fieldErrors }) => {
      issueCoupon.mockRejectedValue(createAppError(ErrorKind.NOT_FOUND));
      getManagedUser.mockResolvedValue({ deletedAt: null });

      const state = await issueUserCouponAction(idleActionState(), issueForm(overrides));

      expect(state).toEqual({
        status: "error",
        kind: ErrorKind.NOT_FOUND,
        formError: null,
        fieldErrors,
      });
    },
  );

  it("対象を絞って 404 で拒まれたら、送った宛先を 1 回だけ読み直す", async () => {
    issueCoupon.mockRejectedValue(createAppError(ErrorKind.NOT_FOUND));
    getManagedUser.mockResolvedValue({ deletedAt: null });

    await issueUserCouponAction(idleActionState(), issueForm(CATEGORY_SCOPE));

    expect(getManagedUser).toHaveBeenCalledOnce();
    expect(getManagedUser).toHaveBeenCalledWith(toUserId(USER_ID));
  });

  it("対象を絞って 404 で拒まれ、読み直した宛先が退会済みなら、宛先が失われた文言を返す", async () => {
    issueCoupon.mockRejectedValue(createAppError(ErrorKind.NOT_FOUND));
    getManagedUser.mockResolvedValue({ deletedAt: "2026-10-01T00:00:00.000Z" });

    const state = await issueUserCouponAction(idleActionState(), issueForm(CATEGORY_SCOPE));

    expect(state).toEqual({
      status: "error",
      kind: ErrorKind.NOT_FOUND,
      formError: null,
      fieldErrors: { userId: [ISSUE_RECIPIENT_LOST_MESSAGE] },
    });
  });

  it("対象を絞って 404 で拒まれ、読み直した宛先も 404 なら、宛先が失われた文言を返す", async () => {
    issueCoupon.mockRejectedValue(createAppError(ErrorKind.NOT_FOUND));
    getManagedUser.mockRejectedValue(createAppError(ErrorKind.NOT_FOUND));

    const state = await issueUserCouponAction(idleActionState(), issueForm(CATEGORY_SCOPE));

    expect(state).toEqual({
      status: "error",
      kind: ErrorKind.NOT_FOUND,
      formError: null,
      fieldErrors: { userId: [ISSUE_RECIPIENT_LOST_MESSAGE] },
    });
  });

  it("対象を絞って 404 で拒まれ、読み直しが認証切れで拒まれたら、この画面へ戻る入り直しへ送る", async () => {
    issueCoupon.mockRejectedValue(createAppError(ErrorKind.NOT_FOUND));
    getManagedUser.mockRejectedValue(createAppError(ErrorKind.UNAUTHENTICATED));

    await expect(
      issueUserCouponAction(idleActionState(), issueForm(CATEGORY_SCOPE)),
    ).rejects.toThrow(`NEXT_REDIRECT:${loginPath(ISSUE_SCREEN_PATH)}`);
  });

  it("対象を絞って 404 で拒まれ、読み直しがほかの理由で失敗したら、どちらが失われたか判らない文言を返す", async () => {
    issueCoupon.mockRejectedValue(createAppError(ErrorKind.NOT_FOUND));
    getManagedUser.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    const state = await issueUserCouponAction(idleActionState(), issueForm(CATEGORY_SCOPE));

    expect(state).toEqual({
      status: "error",
      kind: ErrorKind.NOT_FOUND,
      formError: ISSUE_TARGET_UNKNOWN_MESSAGE,
    });
  });

  it("404・409・422 以外の分類で拒まれたら、宛先を読み直さずに分類の既定の文言を返す", async () => {
    issueCoupon.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    const state = await issueUserCouponAction(idleActionState(), issueForm());

    expect(state).toEqual({
      status: "error",
      kind: ErrorKind.UNAVAILABLE,
      formError: getDefaultErrorMeta(ErrorKind.UNAVAILABLE).message,
    });
    expect(getManagedUser).not.toHaveBeenCalled();
  });

  it("分類の無い例外で失敗したら、宛先を読み直さずに internal として返す", async () => {
    issueCoupon.mockRejectedValue(new Error("unexpected"));

    const state = await issueUserCouponAction(idleActionState(), issueForm());

    expect(state).toEqual({
      status: "error",
      kind: ErrorKind.INTERNAL,
      formError: getDefaultErrorMeta(ErrorKind.INTERNAL).message,
    });
    expect(getManagedUser).not.toHaveBeenCalled();
  });
});
