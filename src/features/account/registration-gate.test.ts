import { beforeEach, describe, expect, it, vi } from "vitest";

const { findRegistration, redirect } = vi.hoisted(() => ({
  findRegistration: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("@/adapters/server/api/users", () => ({ findRegistration }));
vi.mock("next/navigation", () => ({ redirect }));

import { requireRegisteredUser, requireUnregisteredUser } from "./registration-gate";

beforeEach(() => {
  findRegistration.mockReset();
  redirect.mockClear();
});

describe("requireRegisteredUser", () => {
  // ----- 正常系 -----
  it("登録済みならそのまま画面を描かせる", async () => {
    findRegistration.mockResolvedValue("registered");

    await expect(requireRegisteredUser("/mypage")).resolves.toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });

  // ----- 異常系 -----
  it("未認証なら、戻り先を持たせてログインへ送る", async () => {
    findRegistration.mockResolvedValue("unauthenticated");

    await expect(requireRegisteredUser("/mypage")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login?returnUrl=%2Fmypage");
  });

  it("未登録なら、戻り先を持たせて登録へ送る", async () => {
    findRegistration.mockResolvedValue("unregistered");

    await expect(requireRegisteredUser("/checkout")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/onboarding?returnUrl=%2Fcheckout");
  });

  it("外部の URL を戻り先に渡されても、送り先の中では自サイトへ倒す", async () => {
    findRegistration.mockResolvedValue("unregistered");

    await expect(requireRegisteredUser("https://evil.test")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/onboarding?returnUrl=%2F");
  });
});

describe("requireUnregisteredUser", () => {
  // ----- 正常系 -----
  it("未登録ならそのまま登録画面を描かせる", async () => {
    findRegistration.mockResolvedValue("unregistered");

    await expect(requireUnregisteredUser("/mypage")).resolves.toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });

  // ----- 異常系 -----
  it("登録済みなら戻り先へ送り返す", async () => {
    findRegistration.mockResolvedValue("registered");

    await expect(requireUnregisteredUser("/checkout")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/checkout");
  });

  it("未認証なら、登録画面ごと戻り先を持たせてログインへ送る", async () => {
    findRegistration.mockResolvedValue("unauthenticated");

    await expect(requireUnregisteredUser("/checkout")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(
      "/login?returnUrl=%2Fonboarding%3FreturnUrl%3D%252Fcheckout",
    );
  });
});
