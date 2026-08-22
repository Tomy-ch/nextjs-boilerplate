import { describe, expect, it } from "vitest";
import { SESSION_ROLE } from "@/model/session";

import { toTestSessionRecord } from "./test-session-record";

describe("toTestSessionRecord", () => {
  // ----- 正常系 -----
  it("指定した身元で session を組む", () => {
    const record = toTestSessionRecord({
      subject: "user-jane-smith",
      role: SESSION_ROLE.admin,
      expiresInSeconds: 3600,
    });

    expect(record.session).toMatchObject({
      userId: "user-jane-smith",
      role: SESSION_ROLE.admin,
    });
  });

  it("指定した秒数で失効させる", () => {
    const before = Date.now();

    const record = toTestSessionRecord({
      subject: "user-1",
      role: SESSION_ROLE.user,
      expiresInSeconds: 120,
    });

    expect(record.session.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 120 * 1000);
    expect(record.session.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 120 * 1000);
  });

  it("トークンを渡されたら、それを Bearer として持たせる", () => {
    const record = toTestSessionRecord({
      subject: "user-1",
      role: SESSION_ROLE.user,
      expiresInSeconds: 3600,
      accessToken: "real-access-token",
    });

    expect(record).toMatchObject({ accessToken: "real-access-token" });
  });

  it("subject を辿れる形でトークンを組む", () => {
    const record = toTestSessionRecord({
      subject: "user-1",
      role: SESSION_ROLE.user,
      expiresInSeconds: 3600,
    });

    expect(record).toMatchObject({
      accessToken: "test-access-token:user-1",
      idToken: "test-id-token:user-1",
    });
  });
});
