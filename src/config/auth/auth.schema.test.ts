import { describe, expect, it } from "vitest";

import {
  authClientIdValidator,
  authIssuerValidator,
  authRedirectUriValidator,
  authScopesValidator,
  authSessionSecretValidator,
} from "./auth.schema";

describe("authIssuerValidator", () => {
  // ----- 正常系 -----
  it("https の issuer を受け入れる", () => {
    expect(authIssuerValidator().safeParse("https://id.example.test").success).toBe(true);
  });

  // ----- 異常系 -----
  it("http(s) 以外の issuer を拒否する", () => {
    expect(authIssuerValidator().safeParse("ftp://id.example.test").success).toBe(false);
  });
});

describe("authRedirectUriValidator", () => {
  // ----- 正常系 -----
  it("http の redirect URI を受け入れる", () => {
    expect(authRedirectUriValidator().safeParse("http://app.example.test/callback").success).toBe(
      true,
    );
  });

  // ----- 異常系 -----
  it("http(s) 以外の redirect URI を拒否する", () => {
    expect(authRedirectUriValidator().safeParse("ftp://app.example.test/callback").success).toBe(
      false,
    );
  });
});

describe("authClientIdValidator", () => {
  // ----- 正常系 -----
  it("空でない client ID を受け入れる", () => {
    expect(authClientIdValidator().safeParse("web-app").success).toBe(true);
  });

  // ----- 異常系 -----
  it("空の client ID を拒否する", () => {
    expect(authClientIdValidator().safeParse("").success).toBe(false);
  });
});

describe("authScopesValidator", () => {
  // ----- 正常系 -----
  it("空白区切りの scope 列を受け入れる", () => {
    expect(authScopesValidator().safeParse("openid profile").success).toBe(true);
  });

  // ----- 異常系 -----
  it("空白だけの scope を拒否する", () => {
    expect(authScopesValidator().safeParse("   ").success).toBe(false);
  });
});

describe("authSessionSecretValidator", () => {
  // ----- 正常系 -----
  it("32 文字の session secret を受け入れる", () => {
    expect(
      authSessionSecretValidator(false).safeParse("01234567890123456789012345678901").success,
    ).toBe(true);
  });

  it("開発と CI では同梱の値を受け入れる", () => {
    expect(
      authSessionSecretValidator(true).safeParse(
        "local-development-session-secret-change-before-production",
      ).success,
    ).toBe(true);
  });

  // ----- 異常系 -----
  it("32 文字に満たない session secret を拒否する", () => {
    expect(authSessionSecretValidator(false).safeParse("too-short").success).toBe(false);
  });

  it("同梱の値のままなら拒否する", () => {
    expect(
      authSessionSecretValidator(false).safeParse(
        "local-development-session-secret-change-before-production",
      ).success,
    ).toBe(false);
  });

  it("CI 用の同梱値も本番では拒否する", () => {
    expect(
      authSessionSecretValidator(false).safeParse(
        "ci-session-secret-must-never-be-used-in-production",
      ).success,
    ).toBe(false);
  });
});
