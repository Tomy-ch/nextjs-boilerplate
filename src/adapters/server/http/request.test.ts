import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { createHttpClient } from "./request";
import { DEFAULT_PROFILE, type ResilienceProfile } from "./resilience-profile";

const schema = z.object({ ok: z.boolean() });

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

function createClient(
  fetchImpl: typeof fetch,
  overrides: Partial<Parameters<typeof createHttpClient>[0]> = {},
) {
  return createHttpClient({
    baseUrl: "https://api.example.test",
    profile,
    fetchImpl,
    now: () => 0,
    random: () => 0,
    sleep: async () => {},
    ...overrides,
  });
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

    const client = createHttpClient({ baseUrl: "https://api.example.test", profile });

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
      searchParams: { keyword: "本", categoryId: undefined },
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
      searchParams: { categoryId: ["a", "b"], statusId: [] },
      schema,
    });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api.example.test/v1/items?categoryId=a&categoryId=b",
    );
  });

  it("再検証のタグを渡す", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl);

    await client.request({ path: "/v1/items", schema, tags: ["items"] });

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ next: { tags: ["items"] } });
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

  it("本文が無ければ Content-Type を付けない", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createClient(fetchImpl);

    await client.request({ path: "/v1/items", schema });

    expect(fetchImpl.mock.calls[0]?.[1]?.headers).not.toHaveProperty("Content-Type");
  });

  it("204 は本文を読まず、本文を持たない契約として通す", async () => {
    // 空の本文を JSON として解釈しようとすると構文エラーになり、成功した呼び出しが失敗になる。
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
      baseUrl: "https://api.example.test",
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

    await client.request({ path: "/v1/purchases", method: "POST", idempotent: true, schema });

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

  // ----- 異常系 -----
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

  it("要求が誤っている 4xx を再試行しない", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(400, {}));
    const client = createClient(fetchImpl);

    await kindOf(() => client.request({ path: "/v1/items", schema }));

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("宣言の無い POST を再試行しない", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(503, {}));
    const client = createClient(fetchImpl);

    await kindOf(() => client.request({ path: "/v1/purchases", method: "POST", schema }));

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
      vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        throw new DOMException("中断されました", "AbortError");
      }),
      { profile: { ...profile, overallTimeoutMs: 1 } },
    );

    expect(await kindOf(() => client.request({ path: "/v1/ping", schema }))).toBe(
      ErrorKind.CANCELED,
    );
  });

  it("Error でない失敗も分類して落とす", async () => {
    const client = createClient(vi.fn(async () => Promise.reject("切断")));

    expect(await kindOf(() => client.request({ path: "/v1/ping", schema }))).toBe(
      ErrorKind.UNAVAILABLE,
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

    for (let count = 0; count < 3; count += 1) {
      await kindOf(() => client.request({ path: "/v1/ping", schema }));
    }

    expect(fetchImpl.mock.calls.length).toBeLessThan(profile.maxAttempts * 3);
  });
});
