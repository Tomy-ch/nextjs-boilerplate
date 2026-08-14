import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseCookieOptions, SESSION_COOKIE_NAME, TRANSACTION_COOKIE_NAME } from "./session-cookie";

const redirectUri = vi.hoisted(() => ({ value: "http://localhost:3000/api/auth/callback" }));

vi.mock("@/config/auth/auth.server", () => ({
  getAuthConfig: () => ({ redirectUri: redirectUri.value }),
}));

beforeEach(() => {
  redirectUri.value = "http://localhost:3000/api/auth/callback";
});

describe("baseCookieOptions", () => {
  // ----- 正常系 -----
  it("client の JS から読めないようにする", () => {
    expect(baseCookieOptions().httpOnly).toBe(true);
  });

  it("IdP からのリダイレクトで送出される制限にする", () => {
    expect(baseCookieOptions().sameSite).toBe("lax");
  });

  it("https で配信されていれば secure を付ける", () => {
    redirectUri.value = "https://app.example.test/api/auth/callback";

    expect(baseCookieOptions().secure).toBe(true);
  });

  it("http で配信されていれば secure を付けない", () => {
    expect(baseCookieOptions().secure).toBe(false);
  });
});

describe("SESSION_COOKIE_NAME", () => {
  // ----- 正常系 -----
  it("用途を接頭辞に含める", () => {
    expect(SESSION_COOKIE_NAME).toBe("auth_session");
  });
});

describe("TRANSACTION_COOKIE_NAME", () => {
  // ----- 正常系 -----
  it("session の cookie と別の名前にする", () => {
    expect(TRANSACTION_COOKIE_NAME).not.toBe(SESSION_COOKIE_NAME);
  });
});
