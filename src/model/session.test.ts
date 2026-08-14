import { describe, expect, it } from "vitest";
import { hasAllowedRole, isSessionExpired, SESSION_ROLE, type Session } from "./session";

const session: Session = {
  userId: "user-john-doe",
  role: SESSION_ROLE.user,
  expiresAt: new Date("2026-08-14T00:05:00.000Z"),
};

describe("hasAllowedRole", () => {
  // ----- 正常系 -----
  it("許可された役割を持つ session を通す", () => {
    expect(hasAllowedRole(session, [SESSION_ROLE.user])).toBe(true);
  });

  it("許可の並びに含まれていれば通す", () => {
    expect(hasAllowedRole(session, [SESSION_ROLE.admin, SESSION_ROLE.user])).toBe(true);
  });

  // ----- 異常系 -----
  it("役割が許可に含まれない session を落とす", () => {
    expect(hasAllowedRole(session, [SESSION_ROLE.admin])).toBe(false);
  });

  it("未認証を落とす", () => {
    expect(hasAllowedRole(null, [SESSION_ROLE.user])).toBe(false);
  });

  it("許可が空なら誰も通さない", () => {
    expect(hasAllowedRole(session, [])).toBe(false);
  });
});

describe("isSessionExpired", () => {
  // ----- 正常系 -----
  it("失効時刻より前なら失効していない", () => {
    expect(isSessionExpired(session, new Date("2026-08-14T00:04:59.999Z"))).toBe(false);
  });

  it("失効時刻を過ぎていれば失効とみなす", () => {
    expect(isSessionExpired(session, new Date("2026-08-14T00:05:00.001Z"))).toBe(true);
  });

  it("失効時刻ちょうどを失効とみなす", () => {
    expect(isSessionExpired(session, new Date("2026-08-14T00:05:00.000Z"))).toBe(true);
  });
});
