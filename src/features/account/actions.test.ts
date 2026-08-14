import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { idleActionState } from "@/model/action-state";

const { redirect, revalidatePath, updateMyProfile, withdrawMe } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  revalidatePath: vi.fn(),
  updateMyProfile: vi.fn(),
  withdrawMe: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/adapters/server/api/users", () => ({ updateMyProfile, withdrawMe }));

import { updateProfileAction, withdrawAction } from "./actions";
import type { ProfileFormState, WithdrawFormState } from "./form-state";
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

beforeEach(() => {
  redirect.mockClear();
  revalidatePath.mockReset();
  updateMyProfile.mockReset().mockResolvedValue(PROFILE);
  withdrawMe.mockReset().mockResolvedValue(undefined);
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
