import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { loginPath } from "@/features/auth/facade/paths";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect }));

import { redirectIfUnauthenticated } from "./redirect-if-unauthenticated";

const RETURN_TO = "/admin/users";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("redirectIfUnauthenticated", () => {
  // ----- 正常系 -----
  it("認証切れ以外の失敗なら何もせずに戻る", () => {
    expect(
      redirectIfUnauthenticated(createAppError(ErrorKind.CONFLICT), RETURN_TO),
    ).toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("分類を持たない失敗なら何もせずに戻る", () => {
    expect(redirectIfUnauthenticated(new Error("boom"), RETURN_TO)).toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });

  // ----- 異常系 -----
  it("認証切れの失敗なら、渡した画面へ戻る入り直しへ送る", () => {
    expect(() =>
      redirectIfUnauthenticated(createAppError(ErrorKind.UNAUTHENTICATED), RETURN_TO),
    ).toThrow(`NEXT_REDIRECT:${loginPath(RETURN_TO)}`);
    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith(loginPath(RETURN_TO));
  });

  it("認証切れが cause の奥にあっても入り直しへ送る", () => {
    const wrapped = new Error("adapter", { cause: createAppError(ErrorKind.UNAUTHENTICATED) });

    expect(() => redirectIfUnauthenticated(wrapped, RETURN_TO)).toThrow(
      `NEXT_REDIRECT:${loginPath(RETURN_TO)}`,
    );
  });
});
