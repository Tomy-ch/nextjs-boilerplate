import { describe, expect, it, vi } from "vitest";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { fetchOidcEndpoints } from "./oidc-discovery";

const issuer = "https://idp.example.test";

const document = {
  issuer,
  authorization_endpoint: `${issuer}/oidc/authorize`,
  token_endpoint: `${issuer}/oidc/token`,
  jwks_uri: `${issuer}/oidc/jwks`,
  end_session_endpoint: `${issuer}/oidc/logout`,
};

/** 失敗の分類を取り出す。分類の付かない失敗は undefined になる。 */
async function kindOf(run: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await run();
  } catch (error) {
    return findAppError(error)?.kind;
  }

  return undefined;
}

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchOidcEndpoints", () => {
  // ----- 正常系 -----
  it("仕様が定める固定パスから取得する", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => respond(document));

    await fetchOidcEndpoints(issuer, fetchImpl);

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(`${issuer}/.well-known/openid-configuration`);
  });

  it("使う口を取り出す", async () => {
    const endpoints = await fetchOidcEndpoints(issuer, async () => respond(document));

    expect(endpoints).toEqual({
      authorizationEndpoint: `${issuer}/oidc/authorize`,
      tokenEndpoint: `${issuer}/oidc/token`,
      jwksUri: `${issuer}/oidc/jwks`,
      endSessionEndpoint: `${issuer}/oidc/logout`,
    });
  });

  it("ログアウトの口を持たない IdP では null にする", async () => {
    const endpoints = await fetchOidcEndpoints(issuer, async () =>
      respond({ ...document, end_session_endpoint: undefined }),
    );

    expect(endpoints.endSessionEndpoint).toBeNull();
  });

  // ----- 異常系 -----
  it("issuer が設定と一致しなければ落とす", async () => {
    const kind = await kindOf(() =>
      fetchOidcEndpoints(issuer, async () =>
        respond({ ...document, issuer: "https://attacker.example.test" }),
      ),
    );

    expect(kind).toBe(ErrorKind.INTERNAL);
  });

  it("使う口が欠けていれば契約破れとして落とす", async () => {
    const kind = await kindOf(() =>
      fetchOidcEndpoints(issuer, async () => respond({ ...document, token_endpoint: undefined })),
    );

    expect(kind).toBe(ErrorKind.INTERNAL);
  });

  it("取得に失敗すれば応答の status に応じた分類で落とす", async () => {
    const kind = await kindOf(() =>
      fetchOidcEndpoints(issuer, async () => respond({ error: "not found" }, 404)),
    );

    expect(kind).toBe(ErrorKind.NOT_FOUND);
  });
});
