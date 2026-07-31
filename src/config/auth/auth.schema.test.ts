import { describe, expect, it } from "vitest";

import {
  authClientIdValidator,
  authIssuerValidator,
  authRedirectUriValidator,
  authScopesValidator,
  authSessionSecretValidator,
} from "./auth.schema";

describe("auth schema", () => {
  it("OIDC URL に http または https を要求する", () => {
    expect(authIssuerValidator().safeParse("https://id.example.test").success).toBe(true);
    expect(authRedirectUriValidator().safeParse("http://app.example.test/callback").success).toBe(
      true,
    );
    expect(authIssuerValidator().safeParse("ftp://id.example.test").success).toBe(false);
    expect(authRedirectUriValidator().safeParse("ftp://app.example.test/callback").success).toBe(
      false,
    );
  });

  it("client ID と scope の空値を拒否する", () => {
    expect(authClientIdValidator().safeParse("").success).toBe(false);
    expect(authScopesValidator().safeParse("   ").success).toBe(false);
    expect(authScopesValidator().safeParse("openid profile").success).toBe(true);
  });

  it("session secret に 32 文字以上を要求する", () => {
    expect(authSessionSecretValidator().safeParse("01234567890123456789012345678901").success).toBe(
      true,
    );
    expect(authSessionSecretValidator().safeParse("too-short").success).toBe(false);
  });
});
