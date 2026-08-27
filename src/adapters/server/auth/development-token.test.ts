import { afterEach, describe, expect, it, vi } from "vitest";

import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { errorMetaFrom } from "@/errors/error-meta";

import { issueDevelopmentAccessToken, REQUIRED_IDP } from "./development-token";

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

/** 宛先に何も立っていない状態にする。 */
function stubUnreachable(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async () => {
      throw new TypeError("fetch failed");
    }),
  );
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
    stubUnreachable();

    const message = await messageOf(() =>
      issueDevelopmentAccessToken({ subject: "user-john-doe", issuer }),
    );

    expect(message).toContain(issuer);
    expect(message).toContain(REQUIRED_IDP);
  });

  it("Discovery の段で落ちたときは、トークンの段を名指ししない", async () => {
    stubUnreachable();

    const message = await messageOf(() =>
      issueDevelopmentAccessToken({ subject: "user-john-doe", issuer }),
    );

    expect(message).toContain("接続先を引けませんでした");
    expect(message).not.toContain("トークンを取れませんでした");
  });

  it("届かなかったことを、応答が違ったことと混ぜない", async () => {
    stubUnreachable();

    expect(
      await kindOf(() => issueDevelopmentAccessToken({ subject: "user-john-doe", issuer })),
    ).toBe(ErrorKind.UNAVAILABLE);
  });

  it("名乗る issuer がずれた IdP は、分類まで潰さずに落とす", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () =>
        respond({ ...discovery, issuer: "https://another-idp.example.test" }),
      ),
    );

    expect(
      await kindOf(() => issueDevelopmentAccessToken({ subject: "user-john-doe", issuer })),
    ).toBe(ErrorKind.INTERNAL);
  });

  it("トークンの段で落ちたときは、Discovery の段を名指ししない", async () => {
    stubFetch(respond({ error: "unsupported_grant_type" }, 400));

    const message = await messageOf(() =>
      issueDevelopmentAccessToken({ subject: "user-john-doe", issuer }),
    );

    expect(message).toContain("トークンを取れませんでした");
    expect(message).not.toContain("接続先を引けませんでした");
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
