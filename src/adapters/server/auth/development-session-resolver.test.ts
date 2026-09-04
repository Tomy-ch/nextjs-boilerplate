import { describe, expect, it, vi } from "vitest";

import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { SESSION_ROLE } from "@/model/session";

import { issueDevelopmentAuthorizationCode } from "./development-authorization-code";
import { createDevelopmentSessionResolver } from "./development-session-resolver";
import type { AuthorizationTransaction } from "./session-resolver";

const sessionSecret = "ci-session-secret-must-never-be-used-in-production";

vi.mock("@/config/auth/auth.server", () => ({
  getAuthConfig: () => ({ sessionSecret }),
}));

const resolver = createDevelopmentSessionResolver({
  issuer: "http://localhost:4000",
  clientId: "boilerplate-client",
  redirectUri: "http://localhost:3000/api/auth/callback",
  scopes: "openid profile",
  sessionSecret,
  maxUrlBytes: 8_000,
});

/** 発行の指定を、その要求の認可コードへ封緘する。callback が受け取るものと同じ形。 */
function issueCode(state: string, subject: string, role: "admin" | "user"): Promise<string> {
  return issueDevelopmentAuthorizationCode({
    state,
    spec: { subject, role, expiresInSeconds: 3600 },
  });
}

describe("createDevelopmentSessionResolver", () => {
  // ----- 正常系 -----
  it("IdP ではなく、同じ生成元の開発用の面へ送り出す", async () => {
    const { authorizationUrl } = await resolver.startAuthorization("/account");
    const url = new URL(authorizationUrl);

    expect(url.origin).toBe("http://localhost:3000");
    expect(url.pathname).toBe("/dev/session");
    expect(url.searchParams.get("returnUrl")).toBe("/account");
  });

  it("送り出す先へ、一時状態と同じ state を載せる", async () => {
    const { authorizationUrl, transaction } = await resolver.startAuthorization("/");

    expect(new URL(authorizationUrl).searchParams.get("state")).toBe(transaction.state);
  });

  it("使わない検証子と nonce も置き、一時状態の形を方式で変えない", async () => {
    const { transaction } = await resolver.startAuthorization("/");

    expect(transaction.codeVerifier).not.toBe("");
    expect(transaction.nonce).not.toBe("");
  });

  it("認可コードの指定から session を組み立てる", async () => {
    const { transaction } = await resolver.startAuthorization("/");

    const record = await resolver.completeAuthorization({
      code: await issueCode(transaction.state, "dev-admin", SESSION_ROLE.admin),
      state: transaction.state,
      transaction,
    });

    expect(record.session).toMatchObject({
      userId: "dev-admin",
      role: SESSION_ROLE.admin,
    });
  });

  it("封緘した session を、そのまま復元できる", async () => {
    const { transaction } = await resolver.startAuthorization("/");
    const record = await resolver.completeAuthorization({
      code: await issueCode(transaction.state, "dev-user", SESSION_ROLE.user),
      state: transaction.state,
      transaction,
    });

    const restored = await resolver.restore(await resolver.seal(record));

    expect(restored?.session.userId).toBe("dev-user");
  });

  it("封緘した一時状態を、そのまま復元できる", async () => {
    const { transaction } = await resolver.startAuthorization("/account");

    const restored = await resolver.restoreTransaction(await resolver.sealTransaction(transaction));

    expect(restored).toEqual<AuthorizationTransaction>(transaction);
  });

  it("終わらせる相手が居ないので、送り出す先を持たない", async () => {
    const { transaction } = await resolver.startAuthorization("/");
    const record = await resolver.completeAuthorization({
      code: await issueCode(transaction.state, "dev-user", SESSION_ROLE.user),
      state: transaction.state,
      transaction,
    });

    expect(await resolver.endSession(record)).toBeNull();
  });

  // ----- 異常系 -----
  it("要求時と違う state で戻ってきた応答を拒む", async () => {
    const { transaction } = await resolver.startAuthorization("/");

    const error = await resolver
      .completeAuthorization({
        code: await issueCode(transaction.state, "dev-user", SESSION_ROLE.user),
        state: "someone-elses-state",
        transaction,
      })
      .catch((cause: unknown) => cause);

    expect(findAppError(error)?.kind).toBe(ErrorKind.UNAUTHENTICATED);
  });

  it("別の要求のために発行されたコードを拒む", async () => {
    const { transaction } = await resolver.startAuthorization("/");

    const error = await resolver
      .completeAuthorization({
        code: await issueCode("someone-elses-request", "dev-admin", SESSION_ROLE.admin),
        state: transaction.state,
        transaction,
      })
      .catch((cause: unknown) => cause);

    expect(findAppError(error)?.kind).toBe(ErrorKind.UNAUTHENTICATED);
  });

  it("封緘していないコードを拒む", async () => {
    const { transaction } = await resolver.startAuthorization("/");

    const error = await resolver
      .completeAuthorization({
        code: '{"sub":"dev-admin","role":"admin","expiresInSeconds":3600}',
        state: transaction.state,
        transaction,
      })
      .catch((cause: unknown) => cause);

    expect(findAppError(error)?.kind).toBe(ErrorKind.UNAUTHENTICATED);
  });
});
