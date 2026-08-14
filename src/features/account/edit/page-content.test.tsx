// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

const { getMyProfile, getPrefectures } = vi.hoisted(() => ({
  getMyProfile: vi.fn(),
  getPrefectures: vi.fn(),
}));

vi.mock("@/adapters/server/api/users", () => ({ getMyProfile }));
vi.mock("@/adapters/server/api/prefectures", () => ({ getPrefectures }));

import { ToastProvider } from "@/components/shell/toaster/toaster";

import { PREFECTURES, PROFILE } from "../account.fixture";
import { ProfileEditPageContent } from "./page-content";

beforeEach(() => {
  getMyProfile.mockReset().mockResolvedValue(PROFILE);
  getPrefectures.mockReset().mockResolvedValue(PREFECTURES);
});

describe("ProfileEditPageContent", () => {
  it("自分の情報と都道府県マスタを並置して 1 つの画面へ合成する", async () => {
    render(<ToastProvider>{await ProfileEditPageContent()}</ToastProvider>);

    expect(screen.getByLabelText("姓")).toHaveValue("山田");
    expect(within(screen.getByLabelText("都道府県")).getAllByRole("option")).toHaveLength(
      PREFECTURES.length,
    );
  });

  it("互いに依存しない 2 系統を並行で取る", async () => {
    let releaseProfile: (() => void) | undefined;

    // 先頭の取得を止めたまま、後ろが既に出ているかを見る。呼び出しの「順序」を見ると逐次
    // await でも同じ順に並ぶため、並行と逐次を区別できない。
    getMyProfile.mockReturnValue(
      new Promise((resolve) => {
        releaseProfile = () => resolve(PROFILE);
      }),
    );

    const rendered = ProfileEditPageContent();

    await Promise.resolve();

    expect(getPrefectures).toHaveBeenCalled();

    releaseProfile?.();
    render(<ToastProvider>{await rendered}</ToastProvider>);

    expect(screen.getByLabelText("姓")).toHaveValue("山田");
  });

  it("合成にドメインの計算を挟まず、取得した値をそのまま渡す", async () => {
    render(<ToastProvider>{await ProfileEditPageContent()}</ToastProvider>);

    expect(screen.getByLabelText("郵便番号")).toHaveValue(PROFILE.postalCode);
  });

  it("どちらかが失敗したら組み立てず、分類のまま投げる", async () => {
    getPrefectures.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    await expect(ProfileEditPageContent()).rejects.toMatchObject({
      kind: ErrorKind.UNAVAILABLE,
    });
  });
});
