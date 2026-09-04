import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { withErrorDetails } from "@/errors/error-meta";
import { idleActionState } from "@/model/action-state";

const { redirect, registerUser, revalidatePath, updateMyProfile, withdrawMe } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  registerUser: vi.fn(),
  revalidatePath: vi.fn(),
  updateMyProfile: vi.fn(),
  withdrawMe: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/adapters/server/api/users", () => ({ registerUser, updateMyProfile, withdrawMe }));

import { registerAction, updateProfileAction, withdrawAction } from "./actions";
import type { ProfileFormState, WithdrawFormState } from "./form-state";
import { RETURN_URL_FIELD } from "./onboarding/form-names";
import { MYPAGE_PATH } from "./paths";

const PROFILE = {
  firstName: "太郎",
  lastName: "山田",
  email: "taro@example.com",
  phone: "09012345678",
  postalCode: "150-0001",
  prefecture: "東京都",
  city: "渋谷区",
  street: "神宮前 1-2-3",
  building: "サンプルマンション 101",
};

const IDLE_PROFILE: ProfileFormState = idleActionState();
const IDLE_WITHDRAW: WithdrawFormState = idleActionState();

function formDataOf(overrides: Partial<Record<string, string>> = {}): FormData {
  const formData = new FormData();

  for (const [name, value] of Object.entries({ ...PROFILE, ...overrides })) {
    formData.set(name, value);
  }

  return formData;
}

/** 接続先が項目を名指しして拒んだ失敗。 */
function rejectedFields(details: readonly string[]): Error {
  return createAppError(ErrorKind.VALIDATION, {
    cause: withErrorDetails(new Error("接続先が拒みました"), details),
  });
}

beforeEach(() => {
  redirect.mockClear();
  revalidatePath.mockReset();
  registerUser.mockReset().mockResolvedValue(undefined);
  updateMyProfile.mockReset().mockResolvedValue(PROFILE);
  withdrawMe.mockReset().mockResolvedValue(null);
});

describe("updateProfileAction", () => {
  // ----- 正常系 -----
  it("解いた入力を更新へ渡す", async () => {
    await updateProfileAction(IDLE_PROFILE, formDataOf());

    expect(updateMyProfile).toHaveBeenCalledWith(PROFILE);
  });

  it("成功したとき成功の状態を返す", async () => {
    await expect(updateProfileAction(IDLE_PROFILE, formDataOf())).resolves.toEqual({
      status: "success",
      value: undefined,
    });
  });

  it("成功したときマイページの再検証を要求する", async () => {
    await updateProfileAction(IDLE_PROFILE, formDataOf());

    expect(revalidatePath).toHaveBeenCalledWith(MYPAGE_PATH);
  });

  it("空欄の建物名を値の無い状態として渡す", async () => {
    await updateProfileAction(IDLE_PROFILE, formDataOf({ building: "" }));

    expect(updateMyProfile).toHaveBeenCalledWith({ ...PROFILE, building: null });
  });

  // ----- 異常系 -----
  it("入力が規則を外れたとき更新へ出さず、項目の文言を返す", async () => {
    const state = await updateProfileAction(IDLE_PROFILE, formDataOf({ email: "taro@" }));

    expect(updateMyProfile).not.toHaveBeenCalled();
    expect(state).toEqual({
      status: "error",
      formError: "入力内容を確認してください。",
      fieldErrors: { email: ["メールアドレスの形式が正しくありません。"] },
    });
  });

  it("入力が規則を外れたとき再検証を要求しない", async () => {
    await updateProfileAction(IDLE_PROFILE, formDataOf({ email: "taro@" }));

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("更新が拒まれたとき分類に応じた文言を返す", async () => {
    updateMyProfile.mockRejectedValue(createAppError(ErrorKind.CONFLICT));

    await expect(updateProfileAction(IDLE_PROFILE, formDataOf())).resolves.toEqual({
      status: "error",
      formError: "現在の状態ではこの操作を実行できません。",
      fieldErrors: undefined,
      kind: ErrorKind.CONFLICT,
    });
  });

  it("接続先が項目を名指しして拒んだとき、その項目の文言として返す", async () => {
    updateMyProfile.mockRejectedValue(rejectedFields(["email"]));

    await expect(updateProfileAction(IDLE_PROFILE, formDataOf())).resolves.toMatchObject({
      status: "error",
      fieldErrors: {
        email: ["メールアドレスは受け付けられませんでした。入力し直してください。"],
      },
    });
  });

  it("名指しの無い検証の失敗は、項目に紐づけずカタログの文言で返す", async () => {
    updateMyProfile.mockRejectedValue(createAppError(ErrorKind.VALIDATION));

    await expect(updateProfileAction(IDLE_PROFILE, formDataOf())).resolves.toMatchObject({
      formError: "入力内容を確認してください。",
      fieldErrors: undefined,
    });
  });

  it("分類の付いていない失敗のとき internal の文言を返す", async () => {
    updateMyProfile.mockRejectedValue(new Error("boom"));

    await expect(updateProfileAction(IDLE_PROFILE, formDataOf())).resolves.toMatchObject({
      formError: "問題が発生しました。時間をおいて再試行してください。",
    });
  });

  it("更新が失敗したとき再検証を要求しない", async () => {
    updateMyProfile.mockRejectedValue(new Error("boom"));

    await updateProfileAction(IDLE_PROFILE, formDataOf());

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("registerAction", () => {
  const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-8000-00000000000f";

  /** 登録が載せる 2 項目を足した送信。 */
  function registrationFormDataOf(overrides: Partial<Record<string, string>> = {}): FormData {
    return formDataOf({
      idempotencyKey: IDEMPOTENCY_KEY,
      [RETURN_URL_FIELD]: "/mypage",
      ...overrides,
    });
  }

  // ----- 正常系 -----
  it("解いた入力と鍵を登録へ渡す", async () => {
    await expect(registerAction(IDLE_PROFILE, registrationFormDataOf())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(registerUser).toHaveBeenCalledWith(PROFILE, IDEMPOTENCY_KEY);
  });

  it("成立したら戻り先へ送る", async () => {
    await expect(
      registerAction(IDLE_PROFILE, registrationFormDataOf({ [RETURN_URL_FIELD]: "/checkout" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/checkout");
  });

  // ----- 異常系 -----
  it("入力の誤りは項目ごとに返し、登録を呼ばない", async () => {
    const state = await registerAction(IDLE_PROFILE, registrationFormDataOf({ email: "" }));

    expect(state).toMatchObject({
      status: "error",
      fieldErrors: { email: ["メールアドレスを入力してください。"] },
    });
    expect(registerUser).not.toHaveBeenCalled();
  });

  it("鍵の無い送信は、画面を開き直すよう伝えて登録を呼ばない", async () => {
    const formData = registrationFormDataOf();
    formData.delete("idempotencyKey");

    const state = await registerAction(IDLE_PROFILE, formData);

    expect(state).toMatchObject({
      status: "error",
      formError: "登録の要求を受け取れませんでした。画面を開き直してください。",
    });
    expect(registerUser).not.toHaveBeenCalled();
  });

  it("競合には、この画面でしか言えない文言を当てる", async () => {
    registerUser.mockRejectedValue(createAppError(ErrorKind.CONFLICT));

    const state = await registerAction(IDLE_PROFILE, registrationFormDataOf());

    expect(state).toMatchObject({
      status: "error",
      formError:
        "この内容では登録できませんでした。すでに登録が済んでいるか、他の登録と重複しています。",
    });
  });

  it("接続先が項目を名指しして拒んだとき、その項目の文言として返す", async () => {
    registerUser.mockRejectedValue(rejectedFields(["postalCode"]));

    const state = await registerAction(IDLE_PROFILE, registrationFormDataOf());

    expect(state).toMatchObject({
      status: "error",
      fieldErrors: {
        postalCode: ["郵便番号は受け付けられませんでした。入力し直してください。"],
      },
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("競合以外の失敗は分類のまま伝える", async () => {
    registerUser.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    const state = await registerAction(IDLE_PROFILE, registrationFormDataOf());

    expect(state).toMatchObject({ status: "error" });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("withdrawAction", () => {
  // ----- 正常系 -----
  it("退会を実行する", async () => {
    await expect(withdrawAction(IDLE_WITHDRAW, new FormData())).rejects.toThrow("NEXT_REDIRECT:/");
    expect(withdrawMe).toHaveBeenCalledOnce();
  });

  it("成立したら留まる先が無いのでトップへ送る", async () => {
    await expect(withdrawAction(IDLE_WITHDRAW, new FormData())).rejects.toThrow("NEXT_REDIRECT:/");
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("IdP のログアウトを経由してから戻す", async () => {
    const logout = "https://idp.example.test/oidc/logout";
    withdrawMe.mockResolvedValue(logout);

    await expect(withdrawAction(IDLE_WITHDRAW, new FormData())).rejects.toThrow(
      `NEXT_REDIRECT:${logout}`,
    );
    expect(redirect).toHaveBeenCalledWith(logout);
  });

  // ----- 異常系 -----
  it("進行中の購入が残っているとき、この画面でしか言えない理由を返す", async () => {
    withdrawMe.mockRejectedValue(createAppError(ErrorKind.CONFLICT));

    await expect(withdrawAction(IDLE_WITHDRAW, new FormData())).resolves.toEqual({
      status: "error",
      formError:
        "進行中の購入が残っているため退会できません。購入が完了またはキャンセルされてから、もう一度お試しください。",
      fieldErrors: undefined,
    });
  });

  it("それ以外の分類はカタログの文言をそのまま返す", async () => {
    withdrawMe.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    await expect(withdrawAction(IDLE_WITHDRAW, new FormData())).resolves.toMatchObject({
      formError: "現在サービスを利用できません。しばらくしてから再試行してください。",
    });
  });

  it("分類の付いていない失敗のとき internal の文言を返す", async () => {
    withdrawMe.mockRejectedValue(new Error("boom"));

    await expect(withdrawAction(IDLE_WITHDRAW, new FormData())).resolves.toMatchObject({
      formError: "問題が発生しました。時間をおいて再試行してください。",
    });
  });

  it("失敗したとき画面を移さない", async () => {
    withdrawMe.mockRejectedValue(createAppError(ErrorKind.CONFLICT));

    await withdrawAction(IDLE_WITHDRAW, new FormData());

    expect(redirect).not.toHaveBeenCalled();
  });
});
