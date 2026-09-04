import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { findAppError } from "@/errors/app-error";
import { resolveErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";
import { createHttpClient, type PublicHttpClient } from "./request";
import { DEFAULT_PROFILE, type ResilienceProfile } from "./resilience-profile";

const schema = z.object({ ok: z.boolean() });

const MAX_URL_BYTES = 8_000;

const profile: ResilienceProfile = {
  ...DEFAULT_PROFILE,
  breaker: { ...DEFAULT_PROFILE.breaker, sampleSize: 2, failureRate: 1 },
};

function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

type ClientOverrides = {
  baseUrl?: string;
  maxUrlBytes?: number;
  profile?: ResilienceProfile;
  now?: () => number;
  wallClockNow?: () => number;
  getBearerToken?: () => Promise<string | null>;
  allowAnonymous?: boolean;
  sleep?: (ms: number) => Promise<void>;
};

function createClient(fetchImpl: typeof fetch, overrides: ClientOverrides = {}) {
  return createHttpClient({
    scope: "user-scoped",
    baseUrl: "https://api.example.test",
    maxUrlBytes: MAX_URL_BYTES,
    profile,
    fetchImpl,
    now: () => 0,
    random: () => 0,
    sleep: async () => {},
    ...overrides,
  });
}

/**
 * user-scoped な口を、キャッシュを指定できる面として受け取る。
 *
 * @remarks
 * 型が禁じている組み合わせを実行時の関門へ届けるために要ります。関門が見ているのは
 * **型を迂回して組み立てられた spec** なので、型の側で通る書き方を用意しないと到達できません。
 */
function createEscapedClient(fetchImpl: typeof fetch): PublicHttpClient {
  return createHttpClient({
    scope: "user-scoped",
    baseUrl: "https://api.example.test",
    maxUrlBytes: MAX_URL_BYTES,
    profile,
    fetchImpl,
  });
}

function createPublicClient(fetchImpl: typeof fetch) {
  return createHttpClient({
    scope: "public",
    baseUrl: "https://api.example.test",
    maxUrlBytes: MAX_URL_BYTES,
    profile,
    fetchImpl,
    now: () => 0,
    random: () => 0,
    sleep: async () => {},
  });
}

async function causeOf(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return findAppError(error)?.cause;
  }

  return undefined;
}

async function detailsOf(run: () => Promise<unknown>): Promise<readonly string[]> {
  try {
    await run();
  } catch (error) {
    return resolveErrorMeta(error)?.details ?? [];
  }

  return [];
}

async function kindOf(run: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await run();
  } catch (error) {
    return findAppError(error)?.kind;
  }

  return undefined;
}

describe("createHttpClient", () => {
  // ----- 正常系 -----
  it("実装を渡さなければ呼び出し時の fetch を使う", async () => {
    const globalFetch = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", globalFetch);

    const client = createHttpClient({
      scope: "public",
      baseUrl: "https://api.example.test",
      maxUrlBytes: MAX_URL_BYTES,
      profile,
    });

    await client.request({ path: "/v1/items", schema });

    expect(globalFetch).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("契約に沿う応答を検証して返す", async () => {
    const client = createClient(vi.fn(async () => jsonResponse(200, { ok: true })));

    await expect(client.request({ path: "/v1/ping", schema })).resolves.toEqual({ ok: true });
  });

  it("base URL とクエリから接続先を組み立てる", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl);

    await client.request({
      path: "/v1/items",
      searchParams: { keyword: "本", tag: undefined },
      schema,
    });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api.example.test/v1/items?keyword=%E6%9C%AC",
    );
  });

  it("base URL の path を残したまま繋ぐ", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl, { baseUrl: "https://api.example.test/api/" });

    await client.request({ path: "v1/items", schema });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://api.example.test/api/v1/items");
  });

  it("接続先を離れる要求には資格情報を載せない", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl, { getBearerToken: async () => "token" });

    await client.request({ path: "https://idp.example.test/default/token", schema });

    expect(new Headers(fetchImpl.mock.calls[0]?.[1]?.headers).has("Authorization")).toBe(false);
  });

  it("絶対 URL を渡されたら base URL へ繋がない", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl);

    await client.request({ path: "https://idp.example.test/default/token", schema });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://idp.example.test/default/token");
  });

  it("並びで渡した値を同じキーの繰り返しにする", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl);

    await client.request({
      path: "/v1/items",
      searchParams: { tag: ["a", "b"], state: [] },
      schema,
    });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://api.example.test/v1/items?tag=a&tag=b");
  });

  it("public な口では再検証のタグを渡す", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createPublicClient(fetchImpl);

    await client.request({ path: "/v1/items", schema, tags: ["items"] });

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ next: { tags: ["items"] } });
  });

  it("public な口ではキャッシュの指定を渡す", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createPublicClient(fetchImpl);

    await client.request({ path: "/v1/items", schema, cache: "force-cache" });

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ cache: "force-cache" });
  });

  it("確立中の口では解決済みの Bearer を載せる", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createHttpClient({
      scope: "user-scoped",
      baseUrl: "https://api.example.test",
      maxUrlBytes: MAX_URL_BYTES,
      profile,
      fetchImpl,
      bearerToken: "establishing-token",
    });

    await client.request({ path: "/v1/users/me/roles", schema });

    expect(fetchImpl.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: "Bearer establishing-token",
    });
  });

  it("本文があれば JSON として送る", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl);

    await client.request({
      path: "/v1/items",
      method: "POST",
      body: { name: "名前" },
      schema,
    });

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      body: '{"name":"名前"}',
      headers: { "Content-Type": "application/json" },
    });
  });

  it("form を指定すれば URL 符号化して送る", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl);

    await client.request({
      path: "/token",
      method: "POST",
      form: { grant_type: "authorization_code", code: "a b" },
      schema,
    });

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      body: "grant_type=authorization_code&code=a+b",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  });

  it("multipart を指定すれば FormData をそのまま送る", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl);
    const multipart = new FormData();

    multipart.append("file", new File(["x"], "a.png", { type: "image/png" }));

    await client.request({ method: "POST", path: "/uploads", multipart, schema });

    expect(fetchImpl.mock.calls[0]?.[1]?.body).toBe(multipart);
  });

  it("multipart には Content-Type を付けない。境界文字列を決めるのは runtime のため", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl);
    const multipart = new FormData();

    multipart.append("file", new File(["x"], "a.png", { type: "image/png" }));

    await client.request({ method: "POST", path: "/uploads", multipart, schema });

    const headers = fetchImpl.mock.calls[0]?.[1]?.headers;

    expect(headers).not.toHaveProperty("Content-Type");
  });

  it("本文が無ければ Content-Type を付けない", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl);

    await client.request({ path: "/v1/items", schema });

    expect(fetchImpl.mock.calls[0]?.[1]?.headers).not.toHaveProperty("Content-Type");
  });

  it("204 は本文を読まず、本文を持たない契約として通す", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));
    const client = createClient(fetchImpl);

    await expect(
      client.request({ path: "/v1/items/1", method: "DELETE", schema: z.void() }),
    ).resolves.toBeUndefined();
  });

  it("Bearer の取得口を渡さない接続先へ認証ヘッダを付けない", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl);

    await client.request({ path: "/v1/items", schema });

    expect(fetchImpl.mock.calls[0]?.[1]?.headers).not.toHaveProperty("Authorization");
  });

  it("Bearer を解決できたら Authorization を付ける", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl, { getBearerToken: async () => "access-token" });

    await client.request({ path: "/v1/items", schema });

    expect(fetchImpl.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: "Bearer access-token",
    });
  });

  it("Bearer の解決を試行ごとに繰り返さない", async () => {
    const getBearerToken = vi.fn(async () => "access-token");
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(503, {}))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl, { getBearerToken });

    await client.request({ path: "/v1/items", schema });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(getBearerToken).toHaveBeenCalledOnce();
  });

  it("5xx のあとに成功すれば結果を返す", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(503, {}))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl);

    await expect(client.request({ path: "/v1/ping", schema })).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("接続に失敗しても再試行する", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("接続できません"))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl);

    await expect(client.request({ path: "/v1/ping", schema })).resolves.toEqual({ ok: true });
  });

  it("Retry-After が日時なら壁時計との差を待ち時間に使う", async () => {
    const sleep = vi.fn(async () => {});
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse(503, {}, { "Retry-After": "Fri, 07 Aug 2026 00:00:03 GMT" }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl, {
      sleep,
      wallClockNow: () => Date.parse("2026-08-07T00:00:00.000Z"),
      profile: { ...profile, overallTimeoutMs: 10_000 },
    });

    await client.request({ path: "/v1/ping", schema });

    expect(sleep).toHaveBeenCalledWith(3_000);
  });

  it("Retry-After の指示を待ち時間に使う", async () => {
    const sleep = vi.fn(async () => {});
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(503, {}, { "Retry-After": "2" }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl, {
      sleep,
      profile: { ...profile, overallTimeoutMs: 10_000 },
    });

    await client.request({ path: "/v1/ping", schema });

    expect(sleep).toHaveBeenCalledWith(2_000);
  });

  it("待ち時間の指定が無くても再試行を待ってから行う", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(503, {}))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const client = createHttpClient({
      scope: "public",
      baseUrl: "https://api.example.test",
      maxUrlBytes: MAX_URL_BYTES,
      profile,
      fetchImpl,
      now: () => 0,
      random: () => 0,
    });

    await expect(client.request({ path: "/v1/ping", schema })).resolves.toEqual({ ok: true });
  });

  it("冪等の宣言があれば POST も再試行する", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(503, {}))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl);

    await client.request({ path: "/v1/items", method: "POST", idempotent: true, schema });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("呼び出し固有のヘッダを送る", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl);

    await client.request({ path: "/v1/ping", headers: { "X-Session-Token": "token" }, schema });

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({ "X-Session-Token": "token" }),
    });
  });

  it("認証を任意にした接続先は、資格情報が無くても認証なしで送る", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl, {
      allowAnonymous: true,
      getBearerToken: async () => null,
    });

    await expect(client.request({ path: "/v1/ping", schema })).resolves.toEqual({ ok: true });
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.not.objectContaining({ Authorization: expect.anything() }),
    });
  });

  it("認証を任意にした接続先でも、取得できた資格情報は載せる", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl, {
      allowAnonymous: true,
      getBearerToken: async () => "token",
    });

    await client.request({ path: "/v1/ping", schema });

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({ Authorization: "Bearer token" }),
    });
  });

  it("区間の途中にある点は落とさない", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl);

    await client.request({ path: "/v1/items/a..b/ship", schema });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://api.example.test/v1/items/a..b/ship");
  });

  it("確立中の口でも、接続先を離れる要求には資格情報を載せない", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createHttpClient({
      scope: "user-scoped",
      baseUrl: "https://api.example.test",
      maxUrlBytes: MAX_URL_BYTES,
      profile,
      fetchImpl,
      bearerToken: "establishing-token",
    });

    await client.request({ path: "https://idp.example.test/token", schema });

    expect(fetchImpl.mock.calls[0]?.[1]?.headers).not.toHaveProperty("Authorization");
  });

  // ----- 異常系 -----
  it("user-scoped な口へキャッシュ指定を与えたら、送らずに invalid-argument で落とす", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createEscapedClient(fetchImpl);

    expect(
      await kindOf(() => client.request({ path: "/v1/users/me", schema, cache: "force-cache" })),
    ).toBe(ErrorKind.INVALID_ARGUMENT);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("user-scoped な口へ再検証のタグを与えたら、送らずに invalid-argument で落とす", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createEscapedClient(fetchImpl);

    expect(
      await kindOf(() => client.request({ path: "/v1/users/me", schema, tags: ["users"] })),
    ).toBe(ErrorKind.INVALID_ARGUMENT);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("呼び出しごとの指定に資格情報のヘッダを置いたら、送らずに invalid-argument で落とす", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl);

    expect(
      await kindOf(() =>
        client.request({ path: "/v1/items", schema, headers: { authorization: "Bearer x" } }),
      ),
    ).toBe(ErrorKind.INVALID_ARGUMENT);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("路を畳む区間を含む path を、送らずに invalid-argument で落とす", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl);

    expect(
      await kindOf(() =>
        client.request({ path: `/v1/items/${encodeURIComponent("..")}/ship`, schema }),
      ),
    ).toBe(ErrorKind.INVALID_ARGUMENT);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("路の末尾で畳む区間も落とす", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl);

    expect(await kindOf(() => client.request({ path: "/v1/items/..", schema }))).toBe(
      ErrorKind.INVALID_ARGUMENT,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("路の先頭が畳む区間でも落とす", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl);

    expect(await kindOf(() => client.request({ path: "../v1/items", schema }))).toBe(
      ErrorKind.INVALID_ARGUMENT,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("現在地を指す区間も落とす", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl);

    expect(await kindOf(() => client.request({ path: "/v1/items/./ship", schema }))).toBe(
      ErrorKind.INVALID_ARGUMENT,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("予算を超えた URL を、送らずに uri-too-long で落とす", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl, { maxUrlBytes: 60 });

    expect(
      await kindOf(() =>
        client.request({ path: "/v1/items", searchParams: { keyword: "x".repeat(100) }, schema }),
      ),
    ).toBe(ErrorKind.URI_TOO_LONG);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("base URL のパスを含めた合成後の長さで予算を判定する", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl, {
      baseUrl: "https://api.example.test/very/long/prefix",
      maxUrlBytes: 20,
    });

    expect(await kindOf(() => client.request({ path: "/v1/items", schema }))).toBe(
      ErrorKind.URI_TOO_LONG,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("予算を超えた要求では Bearer の解決を試みない", async () => {
    const getBearerToken = vi.fn(async () => "token");
    const client = createClient(
      vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true })),
      {
        maxUrlBytes: 60,
        getBearerToken,
      },
    );

    await kindOf(() =>
      client.request({ path: "/v1/items", searchParams: { keyword: "x".repeat(100) }, schema }),
    );

    expect(getBearerToken).not.toHaveBeenCalled();
  });

  it("予算を超えた要求では遮断器を進めない", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl, { maxUrlBytes: 60 });
    const tooLong = { path: "/v1/items", searchParams: { keyword: "x".repeat(100) }, schema };

    await kindOf(() => client.request(tooLong));
    await kindOf(() => client.request(tooLong));

    await expect(client.request({ path: "/v1/items", schema })).resolves.toEqual({ ok: true });
  });

  it("認証が要る接続先で Bearer を解決できないとき、送らずに未認証で落とす", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl, { getBearerToken: async () => null });

    expect(await kindOf(() => client.request({ path: "/v1/items", schema }))).toBe(
      ErrorKind.UNAUTHENTICATED,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("生の status を漏らさず分類で落とす", async () => {
    const client = createClient(vi.fn(async () => jsonResponse(404, {})));

    expect(await kindOf(() => client.request({ path: "/v1/items/1", schema }))).toBe(
      ErrorKind.NOT_FOUND,
    );
  });

  it("接続先が名指しした項目名を、失敗に載せて渡す", async () => {
    const client = createClient(
      vi.fn(async () => jsonResponse(422, { code: "VALIDATION_FAILED", details: ["email"] })),
    );

    expect(await detailsOf(() => client.request({ path: "/v1/users/1", schema }))).toEqual([
      "email",
    ]);
  });

  it("詳細を宣言していない status では本文を読まない", async () => {
    const client = createClient(vi.fn(async () => jsonResponse(409, { details: ["email"] })));

    expect(await detailsOf(() => client.request({ path: "/v1/users/1", schema }))).toEqual([]);
  });

  it("本文が JSON でない 422 でも、分類をすり替えない", async () => {
    const client = createClient(
      vi.fn(async () => new Response("<html>Gateway</html>", { status: 422 })),
    );

    expect(await kindOf(() => client.request({ path: "/v1/users/1", schema }))).toBe(
      ErrorKind.VALIDATION,
    );
  });

  it("本文が JSON でない 422 では詳細を載せない", async () => {
    const client = createClient(
      vi.fn(async () => new Response("<html>Gateway</html>", { status: 422 })),
    );

    expect(await detailsOf(() => client.request({ path: "/v1/users/1", schema }))).toEqual([]);
  });

  it("契約と違う形の詳細は載せない", async () => {
    const client = createClient(vi.fn(async () => jsonResponse(422, { details: [{ name: 1 }] })));

    expect(await detailsOf(() => client.request({ path: "/v1/users/1", schema }))).toEqual([]);
  });

  it("要求が誤っている 4xx を再試行しない", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(400, {}));
    const client = createClient(fetchImpl);

    await kindOf(() => client.request({ path: "/v1/items", schema }));

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("宣言の無い POST を再試行しない", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(503, {}));
    const client = createClient(fetchImpl);

    await kindOf(() => client.request({ path: "/v1/items", method: "POST", schema }));

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("契約と一致しない応答を internal として扱う", async () => {
    const client = createClient(vi.fn(async () => jsonResponse(200, { ok: "はい" })));

    expect(await kindOf(() => client.request({ path: "/v1/ping", schema }))).toBe(
      ErrorKind.INTERNAL,
    );
  });

  it("試行の上限で打ち切る", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(503, {}));
    const client = createClient(fetchImpl);

    expect(await kindOf(() => client.request({ path: "/v1/ping", schema }))).toBe(
      ErrorKind.UNAVAILABLE,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(profile.maxAttempts);
  });

  it("全体の期限を越える待ちを挟まず諦める", async () => {
    const sleep = vi.fn(async () => {});
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse(503, {}, { "Retry-After": "60" }),
    );
    const client = createClient(fetchImpl, { sleep });

    await kindOf(() => client.request({ path: "/v1/ping", schema }));

    expect(sleep).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("経過時間だけで期限に達したら、待ちが短くても諦める", async () => {
    // 締切は単調時計で測る。待ちの長さではなく、試行に費やした時間の積算で越えさせる。
    const now = vi.fn(() => 0);

    now.mockReturnValueOnce(0).mockReturnValue(profile.overallTimeoutMs);

    const sleep = vi.fn(async () => {});
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(503, {}));
    const client = createClient(fetchImpl, { now, sleep });

    await kindOf(() => client.request({ path: "/v1/ping", schema }));

    expect(sleep).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("Error の失敗は原因をそのまま残す", async () => {
    const cause = new Error("接続できません");

    expect(
      await causeOf(() =>
        createClient(
          vi.fn(async () => {
            throw cause;
          }),
        ).request({ path: "/v1/ping", schema }),
      ),
    ).toBe(cause);
  });

  it("通信が中断されたら待たせずに落とす", async () => {
    const client = createClient(
      vi.fn(async () => {
        throw new DOMException("中断されました", "AbortError");
      }),
    );

    expect(await kindOf(() => client.request({ path: "/v1/ping", schema }))).toBe(
      ErrorKind.UNAVAILABLE,
    );
  });

  it("全体の期限を過ぎた中断を canceled として扱う", async () => {
    const client = createClient(
      // 期限そのものを待ってから失敗する。実時間の長さで競争させると、どちらが先に来るかを
      // ホストの混み具合が決める。
      vi.fn(async (_url, init) => {
        await new Promise((resolve) => {
          init?.signal?.addEventListener("abort", resolve, { once: true });
        });

        throw new DOMException("中断されました", "AbortError");
      }),
      { profile: { ...profile, overallTimeoutMs: 1 } },
    );

    expect(await kindOf(() => client.request({ path: "/v1/ping", schema }))).toBe(
      ErrorKind.CANCELED,
    );
  });

  it("Error でない失敗は文字列を残した Error へ包んで落とす", async () => {
    const disconnect = () => createClient(vi.fn(async () => Promise.reject("切断")));

    expect(await kindOf(() => disconnect().request({ path: "/v1/ping", schema }))).toBe(
      ErrorKind.UNAVAILABLE,
    );
    expect(await causeOf(() => disconnect().request({ path: "/v1/ping", schema }))).toStrictEqual(
      new Error("切断"),
    );
  });

  it("遮断中は接続せずに落とす", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(503, {}));
    const client = createClient(fetchImpl);

    await kindOf(() => client.request({ path: "/v1/ping", schema }));
    const callsBeforeBreak = fetchImpl.mock.calls.length;
    const kind = await kindOf(() => client.request({ path: "/v1/ping", schema }));

    expect(kind).toBe(ErrorKind.UNAVAILABLE);
    expect(fetchImpl).toHaveBeenCalledTimes(callsBeforeBreak);
  });

  it("予算を使い切ったら再試行しない", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(503, {}));
    const client = createClient(fetchImpl, {
      profile: { ...profile, breaker: { ...profile.breaker, sampleSize: 1_000 } },
    });
    const attemptsPerRequest: number[] = [];

    for (let count = 0; count < 3; count += 1) {
      const before = fetchImpl.mock.calls.length;

      await kindOf(() => client.request({ path: "/v1/ping", schema }));
      attemptsPerRequest.push(fetchImpl.mock.calls.length - before);
    }

    // 予算は失敗 1 件につき 1 消費し、上限の半分を下回ると再試行を止める。失敗だけが続くと
    // 要求ごとの試行回数がそのぶん減り、3 度目には 1 度も再試行できない。
    expect(attemptsPerRequest).toEqual([profile.maxAttempts, 2, 1]);
  });
});
