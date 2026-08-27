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
  it("組み立てた session を cookie へ載せる", async () => {
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
