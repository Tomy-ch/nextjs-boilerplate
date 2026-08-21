import { afterEach, describe, expect, it, vi } from "vitest";

import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { errorMetaFrom } from "@/errors/error-meta";

import { issueDevelopmentAccessToken } from "./development-token";

const issuer = "https://idp.example.test";

/** 失敗の文面が名乗るべき、繋ぐ相手の性質。 */
const REQUIRED_IDP_HINT = "Resource Owner Password Credentials";

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

/** 画面が受け取る文言を取り出す。カタログの既定ではなく、この口が載せたもの。 */
async function messageOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    return errorMetaFrom(error)?.message ?? "";
  }

  return "";
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
  it("口が拒んだとき、下の層が付けた分類を作り直さない", async () => {
    stubFetch(respond({ error: "invalid_client" }, 401));

    expect(
      await kindOf(() => issueDevelopmentAccessToken({ subject: "user-john-doe", issuer })),
    ).toBe(ErrorKind.UNAUTHENTICATED);
  });

  it("IdP が居なければ、宛先と求めている性質を名指しして落ちる", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    const message = await messageOf(() =>
      issueDevelopmentAccessToken({ subject: "user-john-doe", issuer }),
    );

    expect(message).toContain(issuer);
    expect(message).toContain("Discovery");
    expect(message).toContain("Resource Owner Password Credentials");
  });

  it("届かなかったことを、応答が違ったことと混ぜない", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    expect(
      await kindOf(() => issueDevelopmentAccessToken({ subject: "user-john-doe", issuer })),
    ).toBe(ErrorKind.UNAVAILABLE);
  });

  it("宛先が URL として壊れていても、生の失敗を素通しせず宛先を名指しする", async () => {
    const message = await messageOf(() =>
      issueDevelopmentAccessToken({ subject: "user-john-doe", issuer: "htp:/localhost:2010" }),
    );

    expect(message).toContain("htp:/localhost:2010");
    expect(message).toContain(REQUIRED_IDP_HINT);
  });

  it("トークンの段で拒まれたときは、Discovery ではなくその段を名指しする", async () => {
    stubFetch(respond({ error: "unsupported_grant_type" }, 400));

    const message = await messageOf(() =>
      issueDevelopmentAccessToken({ subject: "user-john-doe", issuer }),
    );

    expect(message).toContain("主体を名指しするトークン要求");
    expect(message).not.toContain("Discovery を返しませんでした");
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
