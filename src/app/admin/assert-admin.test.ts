import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { loginPath } from "@/features/auth/facade/paths";
import { SESSION_ROLE, type Session, type SessionRole } from "@/model/session";

const { redirect, verifySession } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  verifySession: vi.fn<() => Promise<Session | null>>(),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/adapters/server/auth/session", () => ({ verifySession }));

import { assertAdmin } from "./assert-admin";

const RETURN_TO = "/admin/users";

function session(role: SessionRole): Session {
  return {
    userId: "0195f0c2-0000-7000-9000-0000000000a1",
    role,
    expiresAt: new Date("2099-01-01T00:00:00.000Z"),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  verifySession.mockResolvedValue(session(SESSION_ROLE.admin));
});

describe("assertAdmin", () => {
  // ----- 正常系 -----
  it("管理の役割を持つ session なら通す", async () => {
    await expect(assertAdmin(RETURN_TO)).resolves.toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });

  // ----- 異常系 -----
  it("session が無ければ、渡した画面へ戻る入り直しへ送る", async () => {
    verifySession.mockResolvedValue(null);

    await expect(assertAdmin(RETURN_TO)).rejects.toThrow(`NEXT_REDIRECT:${loginPath(RETURN_TO)}`);
    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith(loginPath(RETURN_TO));
  });

  it("管理の役割を持たない session なら PERMISSION_DENIED で拒む", async () => {
    verifySession.mockResolvedValue(session(SESSION_ROLE.user));

    await expect(assertAdmin(RETURN_TO)).rejects.toThrow(AppError);
    await expect(assertAdmin(RETURN_TO)).rejects.toMatchObject({
      kind: ErrorKind.PERMISSION_DENIED,
    });
    expect(redirect).not.toHaveBeenCalled();
  });
});
