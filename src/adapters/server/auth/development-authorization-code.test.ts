import { EncryptJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";

import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { SESSION_ROLE } from "@/model/session";

import {
  issueDevelopmentAuthorizationCode,
  openDevelopmentAuthorizationCode,
} from "./development-authorization-code";
import { deriveSealKey, SEAL_HEADER } from "./seal-key";
import type { TestSessionSpec } from "./test-session-record";

const sessionSecret = "ci-session-secret-must-never-be-used-in-production";

vi.mock("@/config/auth/auth.server", () => ({
  getAuthConfig: () => ({ sessionSecret }),
}));

afterEach(() => {
  vi.useRealTimers();
});

/** 個々の試験は、この既定から 1 つだけを変える。 */
function issue(overrides: { state?: string; spec?: Partial<TestSessionSpec> } = {}) {
  const spec: TestSessionSpec = {
    subject: "dev-user",
    role: SESSION_ROLE.user,
    expiresInSeconds: 120,
    ...overrides.spec,
  };

  return issueDevelopmentAuthorizationCode({ state: overrides.state ?? "tx-state", spec });
}

/** 秘密値を指定して、任意の中身を封緘する。宣言に無い形のコードを組むために使う。 */
async function seal(payload: Record<string, unknown>, secret: string): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);

  return new EncryptJWT(payload)
    .setProtectedHeader(SEAL_HEADER)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + 600)
    .encrypt(await deriveSealKey(secret));
}

describe("issueDevelopmentAuthorizationCode", () => {
  // ----- 正常系 -----
  it("指定を URL に読める形で載せない", async () => {
    const code = await issue({ spec: { subject: "dev-admin", role: SESSION_ROLE.admin } });

    expect(code).not.toContain("dev-admin");
    expect(code).not.toContain(SESSION_ROLE.admin);
  });

  it("発行元の要求も一緒に封緘する", async () => {
    const code = await issue({ state: "the-request" });

    expect((await openDevelopmentAuthorizationCode(code, sessionSecret)).state).toBe("the-request");
  });
});

describe("openDevelopmentAuthorizationCode", () => {
  // ----- 正常系 -----
  it("発行した指定をそのまま戻す", async () => {
    const code = await issue({ spec: { accessToken: "token-from-idp" } });

    expect((await openDevelopmentAuthorizationCode(code, sessionSecret)).spec).toEqual({
      subject: "dev-user",
      role: SESSION_ROLE.user,
      expiresInSeconds: 120,
      accessToken: "token-from-idp",
    });
  });

  it("トークンを渡していなければ、戻した指定にも載せない", async () => {
    const code = await issue();

    expect((await openDevelopmentAuthorizationCode(code, sessionSecret)).spec).not.toHaveProperty(
      "accessToken",
    );
  });

  // ----- 異常系 -----
  it("別の秘密値で開こうとすると、認証されていないとして拒む", async () => {
    const code = await issue();

    const error = await openDevelopmentAuthorizationCode(code, "another-session-secret").catch(
      (cause: unknown) => cause,
    );

    expect(findAppError(error)?.kind).toBe(ErrorKind.UNAUTHENTICATED);
  });

  it("役割を書き換えたコードを拒む", async () => {
    const code = await seal(
      { state: "tx-state", sub: "dev-user", role: "superuser", expiresInSeconds: 120 },
      sessionSecret,
    );

    const error = await openDevelopmentAuthorizationCode(code, sessionSecret).catch(
      (cause: unknown) => cause,
    );

    expect(findAppError(error)?.kind).toBe(ErrorKind.UNAUTHENTICATED);
  });

  it("発行元の要求を持たないコードを拒む", async () => {
    const code = await seal(
      { sub: "dev-user", role: SESSION_ROLE.user, expiresInSeconds: 120 },
      sessionSecret,
    );

    const error = await openDevelopmentAuthorizationCode(code, sessionSecret).catch(
      (cause: unknown) => cause,
    );

    expect(findAppError(error)?.kind).toBe(ErrorKind.UNAUTHENTICATED);
  });

  it("一時状態と同じだけ待ったコードを拒む", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T00:00:00Z"));

    const code = await issue();

    vi.setSystemTime(new Date("2026-08-22T00:10:01Z"));

    const error = await openDevelopmentAuthorizationCode(code, sessionSecret).catch(
      (cause: unknown) => cause,
    );

    expect(findAppError(error)?.kind).toBe(ErrorKind.UNAUTHENTICATED);
  });
});
