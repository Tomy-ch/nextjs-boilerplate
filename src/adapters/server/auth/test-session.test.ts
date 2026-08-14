import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_ROLE } from "@/model/session";
import { issueTestSession } from "./test-session";

const storeSession = vi.hoisted(() => vi.fn());

vi.mock("./session", () => ({ storeSession }));

beforeEach(() => {
  vi.clearAllMocks();
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
