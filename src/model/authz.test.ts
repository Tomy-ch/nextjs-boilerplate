import { describe, expect, it } from "vitest";

import { allowedRolesFor, isAdmin } from "./authz";
import { SESSION_ROLE, type Session } from "./session";

function session(role: Session["role"]): Session {
  return { userId: "user-1", role, expiresAt: new Date("2026-01-01T00:00:00Z") };
}

describe("allowedRolesFor", () => {
  // ----- 正常系 -----
  it("保護していない経路には役割を求めない", () => {
    expect(allowedRolesFor("/help")).toBeNull();
  });

  it("接頭辞そのものを保護の対象にする", () => {
    expect(allowedRolesFor("/admin")).toEqual([SESSION_ROLE.admin]);
  });

  it("接頭辞の下の経路も保護の対象にする", () => {
    expect(allowedRolesFor("/admin/reports")).toEqual([SESSION_ROLE.admin]);
  });

  it("認証だけを求める経路には全役割を返す", () => {
    expect(allowedRolesFor("/account")).toEqual([SESSION_ROLE.admin, SESSION_ROLE.user]);
  });

  it("管理の経路には管理の役割だけを返す", () => {
    expect(allowedRolesFor("/admin/reports")).not.toContain(SESSION_ROLE.user);
  });

  it("宣言より深い経路でも同じ役割を求める", () => {
    expect(allowedRolesFor("/admin/reports/1/edit")).toEqual([SESSION_ROLE.admin]);
  });

  // ----- 異常系 -----
  it("接頭辞に前方一致するだけの別経路を巻き込まない", () => {
    expect(allowedRolesFor("/accounts-public")).toBeNull();
  });

  it("接頭辞を途中に含むだけの経路を巻き込まない", () => {
    expect(allowedRolesFor("/public/admin")).toBeNull();
  });

  it("経路が空でも保護の対象にしない", () => {
    expect(allowedRolesFor("")).toBeNull();
  });
});

describe("isAdmin", () => {
  // ----- 正常系 -----
  it("管理の役割を持つ session を通す", () => {
    expect(isAdmin(session(SESSION_ROLE.admin))).toBe(true);
  });

  // ----- 異常系 -----
  it("役割が足りない session を通さない", () => {
    expect(isAdmin(session(SESSION_ROLE.user))).toBe(false);
  });

  it("未認証を通さない", () => {
    expect(isAdmin(null)).toBe(false);
  });
});
