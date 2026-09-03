import { exportJWK, generateKeyPair, type JWK, SignJWT } from "jose";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { SESSION_ROLE, type SessionRole } from "@/model/session";
import { createDefaultSessionResolver } from "./default-session-resolver";

const issuer = "https://idp.example.test";
const clientId = "boilerplate-client";
const redirectUri = "http://localhost:3000/api/auth/callback";
const sessionSecret = "local-development-session-secret-change-before-production";
const nowMs = Date.UTC(2026, 7, 14, 0, 0, 0);

const discovery = {
  issuer,
  authorization_endpoint: `${issuer}/oidc/authorize`,
  token_endpoint: `${issuer}/oidc/token`,
  jwks_uri: `${issuer}/oidc/jwks`,
  end_session_endpoint: `${issuer}/oidc/logout`,
};

let signingKey: CryptoKey;
let otherKey: CryptoKey;
let publicJwk: JWK;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  const other = await generateKeyPair("RS256", { extractable: true });

  signingKey = pair.privateKey;
  otherKey = other.privateKey;
  publicJwk = await exportJWK(pair.publicKey);
});

/** 失敗の分類を取り出す。分類の付かない失敗は undefined になる。 */
async function kindOf(run: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await run();
  } catch (error) {
    return findAppError(error)?.kind;
  }

  return undefined;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function issueIdToken(
  claims: Readonly<Record<string, unknown>>,
  key: CryptoKey = signingKey,
  withExpiry = true,
): Promise<string> {
  const signed = new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(issuer)
    .setIssuedAt(Math.floor(nowMs / 1000));
  // 宛先を claims で渡された場合はそちらを使う。多値の宛先を扱う経路を確かめるため。
  const token = "aud" in claims ? signed : signed.setAudience(clientId);

  return (withExpiry ? token.setExpirationTime(Math.floor(nowMs / 1000) + 3600) : token).sign(key);
}

/** token endpoint が返す ID Token。認可要求の後に確定するため、参照を差し替えられる形で渡す。 */
type IssuedToken = { value: string };

/** IdP の 4 つの口に応答する実装を組み立てる。 */
function createIdp(issued: IssuedToken, expiresIn: number | undefined): typeof fetch {
  return vi.fn<typeof fetch>(async (input) => {
    const url = String(input);

    if (url.endsWith("/.well-known/openid-configuration")) {
      return json(discovery);
    }
    if (url.endsWith("/oidc/jwks")) {
      return json({ keys: [{ ...publicJwk, kid: "test-key", alg: "RS256", use: "sig" }] });
    }
    if (url.endsWith("/oidc/token")) {
      return json({ access_token: "access-token", id_token: issued.value, expires_in: expiresIn });
    }
    if (url.endsWith("/oidc/logout")) {
      return json({ status: "logged_out" });
    }

    return json({ error: "not_found" }, 404);
  });
}

function createResolver(
  fetchImpl: typeof fetch,
  at: number = nowMs,
  resolveRole?: (accessToken: string) => Promise<SessionRole>,
) {
  return createDefaultSessionResolver({
    issuer,
    clientId,
    redirectUri,
    scopes: "openid profile email",
    sessionSecret,
    maxUrlBytes: 8_000,
    resolveRole,
    fetchImpl,
    now: () => at,
  });
}

/**
 * 認可要求を出し、その nonce を載せた ID Token を IdP に用意させるところまで進める。
 *
 * @remarks
 * nonce は認可要求の時点で決まり、IdP はそれを ID Token へ載せて返します。実物と同じ順序を
 * 踏まないと、nonce の検証を通れるケースが 1 つも作れません。
 */
async function startSignIn(
  options: {
    claims?: Readonly<Record<string, unknown>>;
    key?: CryptoKey;
    expiresIn?: number;
    returnUrl?: string;
    withIdTokenExpiry?: boolean;
    resolveRole?: (accessToken: string) => Promise<SessionRole>;
  } = {},
) {
  const issued: IssuedToken = { value: "" };
  const fetchImpl = createIdp(issued, "expiresIn" in options ? options.expiresIn : 3600);
  const resolver = createResolver(fetchImpl, nowMs, options.resolveRole);
  const started = await resolver.startAuthorization(options.returnUrl ?? "/");

  issued.value = await issueIdToken(
    { sub: "user-1", nonce: started.transaction.nonce, ...options.claims },
    options.key,
    options.withIdTokenExpiry ?? true,
  );

  return {
    ...started,
    resolver,
    fetchImpl,
    complete: async () =>
      resolver.completeAuthorization({
        code: "authorization-code",
        state: started.transaction.state,
        transaction: started.transaction,
      }),
  };
}

describe("createDefaultSessionResolver", () => {
  // ----- 正常系 -----
  it("認可 URL に PKCE と一時状態を載せる", async () => {
    const { authorizationUrl, transaction } = await startSignIn();
    const params = new URL(authorizationUrl).searchParams;

    expect(params.get("response_type")).toBe("code");
    expect(params.get("client_id")).toBe(clientId);
    expect(params.get("redirect_uri")).toBe(redirectUri);
    expect(params.get("code_challenge_method")).toBe("S256");
    expect(params.get("state")).toBe(transaction.state);
    expect(params.get("nonce")).toBe(transaction.nonce);
  });

  it("認可 URL に検証子そのものを載せない", async () => {
    const { authorizationUrl, transaction } = await startSignIn();

    expect(authorizationUrl).not.toContain(transaction.codeVerifier);
  });

  it("復帰先を一時状態へ持ち回る", async () => {
    const { transaction } = await startSignIn({ returnUrl: "/settings?tab=general" });

    expect(transaction.returnUrl).toBe("/settings?tab=general");
  });

  it("認可コードを session へ交換する", async () => {
    const { complete } = await startSignIn({ claims: { sub: "user-john-doe" } });

    const record = await complete();

    expect(record.session.userId).toBe("user-john-doe");
    expect(record.accessToken).toBe("access-token");
  });

  it("access token の残り時間から失効時刻を決める", async () => {
    const { complete } = await startSignIn({ expiresIn: 300 });

    const record = await complete();

    expect(record.session.expiresAt).toEqual(new Date(nowMs + 300 * 1000));
  });

  it("残り時間を返さない IdP では ID Token の失効時刻へ落とす", async () => {
    const { complete } = await startSignIn({ expiresIn: undefined });

    const record = await complete();

    expect(record.session.expiresAt).toEqual(new Date(nowMs + 3600 * 1000));
  });

  it("役割は取得口が返した値になる", async () => {
    const { complete } = await startSignIn({ resolveRole: async () => SESSION_ROLE.admin });

    const record = await complete();

    expect(record.session.role).toBe(SESSION_ROLE.admin);
  });

  it("ID Token の役割の claim は読まない", async () => {
    const { complete } = await startSignIn({
      claims: { role: SESSION_ROLE.admin },
      resolveRole: async () => SESSION_ROLE.user,
    });

    const record = await complete();

    expect(record.session.role).toBe(SESSION_ROLE.user);
  });

  it("取得口へ Access Token を渡す", async () => {
    const seen: string[] = [];
    const { complete } = await startSignIn({
      resolveRole: async (accessToken) => {
        seen.push(accessToken);

        return SESSION_ROLE.user;
      },
    });

    const record = await complete();

    expect(seen).toEqual([record.accessToken]);
  });

  it("宛先が多値のとき、azp が client と一致しなければ受け入れない", async () => {
    const { complete } = await startSignIn({
      claims: { aud: [clientId, "another-client"], azp: "another-client" },
    });

    expect(await kindOf(complete)).toBe(ErrorKind.UNAUTHENTICATED);
  });

  it("役割の取得口を渡さなければ、権限を持たない側に倒す", async () => {
    const { complete } = await startSignIn();

    expect((await complete()).session.role).toBe(SESSION_ROLE.user);
  });

  it("宛先が多値でも、azp が client と一致すれば受け入れる", async () => {
    const { complete } = await startSignIn({
      claims: { aud: [clientId, "example-resource-api"], azp: clientId },
    });

    const record = await complete();

    expect(record.session.userId).toBe("user-1");
  });

  it("封緘した cookie を復元する", async () => {
    const { resolver, complete } = await startSignIn();
    const record = await complete();

    const restored = await resolver.restore(await resolver.seal(record));

    expect(restored).toEqual(record);
  });

  it("封緘した cookie にトークンを平文で置かない", async () => {
    const { resolver, complete } = await startSignIn();
    const record = await complete();

    const sealed = await resolver.seal(record);

    expect(sealed).not.toContain(record.accessToken);
    expect(sealed).not.toContain(record.session.userId);
  });

  it("封緘した一時状態を復元する", async () => {
    const { resolver, transaction } = await startSignIn({ returnUrl: "/mypage" });

    const restored = await resolver.restoreTransaction(await resolver.sealTransaction(transaction));

    expect(restored).toEqual(transaction);
  });

  it("封緘した一時状態に検証子を平文で置かない", async () => {
    const { resolver, transaction } = await startSignIn();

    const sealed = await resolver.sealTransaction(transaction);

    expect(sealed).not.toContain(transaction.codeVerifier);
    expect(sealed).not.toContain(transaction.state);
  });

  it("ログアウトの送り先に id_token_hint を載せる", async () => {
    const { resolver, complete } = await startSignIn();
    const record = await complete();

    const sent = await resolver.endSession(record);

    expect(sent).not.toBeNull();

    const destination = new URL(sent ?? "");

    expect(`${destination.origin}${destination.pathname}`).toBe(`${issuer}/oidc/logout`);
    expect(destination.searchParams.get("id_token_hint")).toBe(record.idToken);
    expect(destination.searchParams.get("client_id")).toBe(clientId);
  });

  it("ログアウトの送り先に Access Token を載せない", async () => {
    const { resolver, complete } = await startSignIn();
    const record = await complete();

    const sent = await resolver.endSession(record);

    expect(sent).not.toBeNull();
    expect(sent).not.toContain(record.accessToken);
  });

  it("ログアウト後の戻り先を callback と同じ origin から導く", async () => {
    const { resolver, complete } = await startSignIn();
    const record = await complete();

    const sent = await resolver.endSession(record);

    expect(sent).not.toBeNull();

    const destination = new URL(sent ?? "");

    expect(destination.searchParams.get("post_logout_redirect_uri")).toBe(
      new URL("/", redirectUri).toString(),
    );
  });

  it("ログアウトの送り先を組み立てるだけで、IdP へは要求を出さない", async () => {
    const { resolver, fetchImpl, complete } = await startSignIn();
    const record = await complete();
    vi.mocked(fetchImpl).mockClear();

    await resolver.endSession(record);

    expect(vi.mocked(fetchImpl)).not.toHaveBeenCalled();
  });

  it("実装を渡さなければ環境の fetch で鍵を取りに行く", async () => {
    const issued: IssuedToken = { value: "" };
    const environmentFetch = createIdp(issued, 3600);
    vi.stubGlobal("fetch", environmentFetch);

    const resolver = createDefaultSessionResolver({
      issuer,
      clientId,
      redirectUri,
      scopes: "openid",
      sessionSecret,
      maxUrlBytes: 8_000,
      resolveRole: async () => SESSION_ROLE.user,
      now: () => nowMs,
    });
    const started = await resolver.startAuthorization("/");
    issued.value = await issueIdToken({ sub: "user-1", nonce: started.transaction.nonce });

    await resolver.completeAuthorization({
      code: "authorization-code",
      state: started.transaction.state,
      transaction: started.transaction,
    });

    expect(
      vi
        .mocked(environmentFetch)
        .mock.calls.some(([input]) => String(input).endsWith("/oidc/jwks")),
    ).toBe(true);
    vi.unstubAllGlobals();
  });

  it("時計を渡さなければ実時計で封緘する", async () => {
    const issued: IssuedToken = { value: "" };
    const resolver = createDefaultSessionResolver({
      issuer,
      clientId,
      redirectUri,
      scopes: "openid",
      sessionSecret,
      maxUrlBytes: 8_000,
      resolveRole: async () => SESSION_ROLE.user,
      fetchImpl: createIdp(issued, 3600),
    });
    const started = await resolver.startAuthorization("/");

    const restored = await resolver.restoreTransaction(
      await resolver.sealTransaction(started.transaction),
    );

    expect(restored).toEqual(started.transaction);
  });

  it("ログアウトの口を持たない IdP なら送り先を返さない", async () => {
    const issued: IssuedToken = { value: "" };
    const fetchImpl = vi.fn<typeof fetch>(async (input, init) => {
      if (String(input).endsWith("/.well-known/openid-configuration")) {
        return json({ ...discovery, end_session_endpoint: undefined });
      }

      return createIdp(issued, 3600)(input, init);
    });
    const resolver = createResolver(fetchImpl);
    const started = await resolver.startAuthorization("/");
    issued.value = await issueIdToken({ sub: "user-1", nonce: started.transaction.nonce });
    const record = await resolver.completeAuthorization({
      code: "authorization-code",
      state: started.transaction.state,
      transaction: started.transaction,
    });

    expect(await resolver.endSession(record)).toBeNull();
  });

  // ----- 異常系 -----
  it("state が一致しなければ交換しない", async () => {
    const { resolver, fetchImpl, transaction } = await startSignIn();

    const kind = await kindOf(() =>
      resolver.completeAuthorization({ code: "code", state: "forged-state", transaction }),
    );

    expect(kind).toBe(ErrorKind.UNAUTHENTICATED);
    expect(
      vi.mocked(fetchImpl).mock.calls.some(([input]) => String(input).endsWith("/oidc/token")),
    ).toBe(false);
  });

  it("nonce が一致しなければ落とす", async () => {
    const { complete } = await startSignIn({ claims: { nonce: "forged-nonce" } });

    expect(await kindOf(complete)).toBe(ErrorKind.UNAUTHENTICATED);
  });

  it("JWKS に無い鍵で署名された ID Token を落とす", async () => {
    const { complete } = await startSignIn({ key: otherKey });

    expect(await kindOf(complete)).toBe(ErrorKind.UNAUTHENTICATED);
  });

  it("subject を持たない ID Token を落とす", async () => {
    const { complete } = await startSignIn({ claims: { sub: undefined } });

    expect(await kindOf(complete)).toBe(ErrorKind.UNAUTHENTICATED);
  });

  it("失効時刻を決められなければ落とす", async () => {
    const { complete } = await startSignIn({ expiresIn: undefined, withIdTokenExpiry: false });

    expect(await kindOf(complete)).toBe(ErrorKind.UNAUTHENTICATED);
  });

  it("Discovery を引けなければログアウトの送り先も組み立てない", async () => {
    const resolver = createResolver(vi.fn<typeof fetch>(async () => json({}, 503)));

    await expect(
      resolver.endSession({
        session: { userId: "user-1", role: SESSION_ROLE.user, expiresAt: new Date(nowMs) },
        accessToken: "access-token",
        idToken: "id-token",
      }),
    ).rejects.toThrow();
  });

  it("Discovery に失敗しても次の呼び出しで取り直す", async () => {
    const issued: IssuedToken = { value: "" };
    let idpIsDown = true;
    const flaky = vi.fn<typeof fetch>(async (input, init) => {
      if (idpIsDown && String(input).endsWith("/.well-known/openid-configuration")) {
        return json({ error: "unavailable" }, 503);
      }

      return createIdp(issued, 3600)(input, init);
    });
    const resolver = createResolver(flaky);

    await expect(resolver.startAuthorization("/")).rejects.toThrow();

    idpIsDown = false;

    await expect(resolver.startAuthorization("/")).resolves.toMatchObject({
      authorizationUrl: expect.stringContaining(issuer),
    });
  });

  it("別の秘密値で封緘された cookie を復元しない", async () => {
    const { resolver, fetchImpl, complete } = await startSignIn();
    const sealed = await resolver.seal(await complete());

    const other = createDefaultSessionResolver({
      issuer,
      clientId,
      redirectUri,
      scopes: "openid",
      sessionSecret: "another-secret-value-that-differs-from-the-original",
      maxUrlBytes: 8_000,
      fetchImpl,
      resolveRole: async () => SESSION_ROLE.user,
      now: () => nowMs,
    });

    expect(await other.restore(sealed)).toBeNull();
  });

  it("失効した cookie を復元しない", async () => {
    const { resolver, fetchImpl, complete } = await startSignIn({ expiresIn: 300 });
    const sealed = await resolver.seal(await complete());

    const later = createResolver(fetchImpl, nowMs + 301 * 1000);

    expect(await later.restore(sealed)).toBeNull();
  });

  it("壊れた cookie を復元しない", async () => {
    const { resolver } = await startSignIn();

    expect(await resolver.restore("not-a-sealed-value")).toBeNull();
  });

  it("壊れた一時状態を復元しない", async () => {
    const { resolver } = await startSignIn();

    expect(await resolver.restoreTransaction("not-a-sealed-value")).toBeNull();
  });

  it("期限を過ぎた一時状態を復元しない", async () => {
    const { resolver, fetchImpl, transaction } = await startSignIn();
    const sealed = await resolver.sealTransaction(transaction);

    const later = createResolver(fetchImpl, nowMs + 601 * 1000);

    expect(await later.restoreTransaction(sealed)).toBeNull();
  });
});
