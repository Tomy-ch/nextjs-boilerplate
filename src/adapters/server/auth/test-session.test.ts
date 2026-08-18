import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_ROLE } from "@/model/session";

import { SESSION_COOKIE_NAME } from "./session-cookie";
import { discardTestSession, issueTestSession } from "./test-session";

const { cookies, storeSession } = vi.hoisted(() => ({
  cookies: vi.fn(),
  storeSession: vi.fn(),
}));

vi.mock("./session", () => ({ storeSession }));
vi.mock("next/headers", () => ({ cookies }));

const deleteCookie = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  cookies.mockResolvedValue({ delete: deleteCookie });
});

describe("issueTestSession", () => {
  // ----- 正常系 -----
  it("指定した身元で session を載せる", async () => {
    await issueTestSession({
      subject: "user-jane-smith",
      role: SESSION_ROLE.admin,
      expiresInSeconds: 3600,
    });

    expect(storeSession.mock.calls[0]?.[0].session).toMatchObject({
      userId: "user-jane-smith",
      role: SESSION_ROLE.admin,
    });
  });

  it("指定した秒数で失効させる", async () => {
    const before = Date.now();

    await issueTestSession({
      subject: "user-1",
      role: SESSION_ROLE.user,
      expiresInSeconds: 120,
    });

    const expiresAt: Date = storeSession.mock.calls[0]?.[0].session.expiresAt;

    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 120 * 1000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 120 * 1000);
  });

  it("トークンを渡されたら、それを Bearer として持たせる", async () => {
    await issueTestSession({
      subject: "user-1",
      role: SESSION_ROLE.user,
      expiresInSeconds: 3600,
      accessToken: "real-access-token",
    });

    expect(storeSession.mock.calls[0]?.[0]).toMatchObject({ accessToken: "real-access-token" });
  });

  it("subject を辿れる形でトークンを組む", async () => {
    await issueTestSession({
      subject: "user-1",
      role: SESSION_ROLE.user,
      expiresInSeconds: 3600,
    });

    expect(storeSession.mock.calls[0]?.[0]).toMatchObject({
      accessToken: "test-access-token:user-1",
      idToken: "test-id-token:user-1",
    });
  });
});

describe("discardTestSession", () => {
  // ----- 正常系 -----
  it("session の cookie を消す", async () => {
    await discardTestSession();

    expect(deleteCookie).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
  });

  it("IdP へは何も伝えない", async () => {
    await discardTestSession();

    expect(storeSession).not.toHaveBeenCalled();
  });
});
