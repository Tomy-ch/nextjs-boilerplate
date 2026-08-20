import { afterEach, describe, expect, it, vi } from "vitest";

import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

import { issueDevelopmentAccessToken } from "./development-token";

const issuer = "https://idp.example.test";

vi.mock("@/config/auth/auth.server", () => ({
  getAuthConfig: () => ({ clientId: "boilerplate-client" }),
}));
vi.mock("@/config/http/http.server", () => ({ getHttpConfig: () => ({ maxUrlBytes: 8_000 }) }));

const discovery = {
  issuer,
  authorization_endpoint: `${issuer}/oidc/authorize`,
  token_endpoint: `${issuer}/oidc/token`,
  jwks_uri: `${issuer}/oidc/jwks`,
};

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Discovery と token endpoint の 2 回の要求に、順に応答を割り当てる。 */
function stubFetch(tokenResponse: Response): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetchImpl = vi.fn<typeof fetch>(async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    return url.includes("openid-configuration") ? respond(discovery) : tokenResponse;
  });

  vi.stubGlobal("fetch", fetchImpl);

  return fetchImpl;
}

/** 失敗の分類を取り出す。分類の付かない失敗は undefined になる。 */
async function kindOf(run: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await run();
  } catch (error) {
    return findAppError(error)?.kind;
  }

  return undefined;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("issueDevelopmentAccessToken", () => {
  // ----- 正常系 -----
  it("Discovery が示した口へ要求する", async () => {
    const fetchImpl = stubFetch(respond({ access_token: "issued-token" }));

    await issueDevelopmentAccessToken({ subject: "user-john-doe", issuer });

    expect(fetchImpl.mock.calls[1]?.[0]).toBe(`${issuer}/oidc/token`);
  });

  it("受け取った主体を利用者名として要求する", async () => {
    const fetchImpl = stubFetch(respond({ access_token: "issued-token" }));

    await issueDevelopmentAccessToken({ subject: "user-john-doe", issuer });

    const body = String(fetchImpl.mock.calls[1]?.[1]?.body);

    expect(new URLSearchParams(body).get("username")).toBe("user-john-doe");
  });

  it("設定の client として要求する", async () => {
    const fetchImpl = stubFetch(respond({ access_token: "issued-token" }));

    await issueDevelopmentAccessToken({ subject: "user-john-doe", issuer });

    const sent = new URLSearchParams(String(fetchImpl.mock.calls[1]?.[1]?.body));

    expect(sent.get("grant_type")).toBe("password");
    expect(sent.get("client_id")).toBe("boilerplate-client");
  });

  it("応答のトークンを返す", async () => {
    stubFetch(respond({ access_token: "issued-token" }));

    expect(await issueDevelopmentAccessToken({ subject: "user-john-doe", issuer })).toBe(
      "issued-token",
    );
  });

  // ----- 異常系 -----
  it("口が拒んだら分類の付いた失敗にする", async () => {
    stubFetch(respond({ error: "invalid_client" }, 401));

    expect(
      await kindOf(() => issueDevelopmentAccessToken({ subject: "user-john-doe", issuer })),
    ).toBe(ErrorKind.UNAUTHENTICATED);
  });

  it("トークンを含まない応答は契約破れとして扱う", async () => {
    stubFetch(respond({ token_type: "Bearer" }));

    expect(
      await kindOf(() => issueDevelopmentAccessToken({ subject: "user-john-doe", issuer })),
    ).toBe(ErrorKind.INTERNAL);
  });

  it("空のトークンも契約破れとして扱う", async () => {
    stubFetch(respond({ access_token: "" }));

    expect(
      await kindOf(() => issueDevelopmentAccessToken({ subject: "user-john-doe", issuer })),
    ).toBe(ErrorKind.INTERNAL);
  });
});
