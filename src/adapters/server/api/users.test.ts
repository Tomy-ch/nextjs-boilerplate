import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Environment } from "@/config/environment";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

const environment: Environment = {
  APP_API_BASE_URL: "https://api.example.test",
  APP_API_MODE: "mock",
  MEDIA_ORIGIN: "https://media.example.test",
  OTEL_EXPORTER_OTLP_ENDPOINT: "https://otel.example.test/v1/traces",
  OBS_TRACES_EXPORTER: "none",
  OBS_METRICS_EXPORTER: "none",
  OBS_LOGS_EXPORTER: "none",
  AUTH_ISSUER: "https://id.example.test",
  AUTH_CLIENT_ID: "nextjs-boilerplate",
  AUTH_REDIRECT_URI: "https://app.example.test/auth/callback",
  AUTH_SCOPES: "openid profile",
  AUTH_SESSION_SECRET: "01234567890123456789012345678901",
  NEXT_PUBLIC_HTTP_MAX_URL_BYTES: 8000,
  NEXT_PUBLIC_HTTP_MAX_UPLOAD_BYTES: 4194304,
};

const { getAccessToken, getEnvironment, getLogger, signOut, verifySession, warn } = vi.hoisted(
  () => {
    const warnFn = vi.fn();

    return {
      getAccessToken: vi.fn(async (): Promise<string | null> => "access-token"),
      getEnvironment: vi.fn(() => environment),
      getLogger: vi.fn(() => ({ warn: warnFn })),
      signOut: vi.fn(async (): Promise<void> => undefined),
      verifySession: vi.fn(),
      warn: warnFn,
    };
  },
);

vi.mock("@/config/environment", () => ({ getEnvironment }));
vi.mock("@/logging/logging.server", () => ({ getLogger }));
vi.mock("../auth/session", () => ({ getAccessToken, signOut, verifySession }));

import {
  findMyProfile,
  findRegistration,
  getMyProfile,
  getMyPurchaseSummary,
  registerUser,
  updateMyProfile,
  withdrawMe,
} from "./users";

/** 更新と退会が対象を指すのに使う内部の識別子。画面へは出さない。 */
const USER_ID = "0195f0c2-0000-7000-8000-0000000000a1";

const wireUser = {
  id: USER_ID,
  firstName: "太郎",
  lastName: "山田",
  email: "taro@example.com",
  phone: "09012345678",
  postalCode: "150-0001",
  prefecture: "東京都",
  city: "渋谷区",
  street: "神宮前 1-2-3",
  building: "サンプルマンション 101",
  deletedAt: null,
};

const profile = {
  firstName: "太郎",
  lastName: "山田",
  email: "taro@example.com",
  phone: "09012345678",
  postalCode: "150-0001",
  prefecture: "東京都",
  city: "渋谷区",
  street: "神宮前 1-2-3",
  building: "サンプルマンション 101",
};

/** 契約はキャンセル済みを集計から除くため、内訳にキャンセルの行は現れない。 */
const wireSummary = {
  period: { from: null, to: null },
  totalCount: 3,
  totalAmount: 300_000,
  itemsTotal: "2800.00",
  statusBreakdown: [
    {
      status: { id: "0195f0c2-0000-7000-8000-0000000000b1", name: "発送済み" },
      count: 2,
      totalAmount: 200_000,
    },
    {
      status: { id: "0195f0c2-0000-7000-8000-0000000000b2", name: "配達済み" },
      count: 1,
      totalAmount: 100_000,
    },
  ],
};

/**
 * 呼び出しの順に応答を返す fetch。
 *
 * @remarks
 * 更新と退会は `/users/me` で識別子を解決してから対象の口を叩くため、1 回の呼び出しで 2 度出ます。
 * 応答を関数で受け取るのは、`Response` の本文が 1 度しか読めないためです。
 */
function stubFetch(...responses: readonly (() => Response)[]): ReturnType<typeof vi.fn> {
  let index = 0;

  const fetchImpl = vi.fn(async () => {
    const next = responses[Math.min(index, responses.length - 1)];

    index += 1;

    return next?.();
  });

  vi.stubGlobal("fetch", fetchImpl);

  return fetchImpl;
}

/** JSON 本文を持つ 200 応答。 */
function json(body: unknown): () => Response {
  return () => new Response(JSON.stringify(body), { status: 200 });
}

/** 分類付きの失敗応答。 */
function failure(status: number): () => Response {
  return () => new Response(JSON.stringify({ message: "失敗しました。" }), { status });
}

/** 本文を持たない 204 応答。契約が `DELETE` に定める形。 */
function noContent(): () => Response {
  return () => new Response(null, { status: 204 });
}

/** 投げられたエラーに付いた分類を返す。投げなければ undefined。 */
async function kindOf(run: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await run();
  } catch (error) {
    return findAppError(error)?.kind;
  }

  return undefined;
}

beforeEach(() => {
  getAccessToken.mockReset();
  getAccessToken.mockResolvedValue("access-token");
  signOut.mockReset();
  signOut.mockResolvedValue(undefined);
  verifySession.mockReset();
  verifySession.mockResolvedValue({ userId: "subject", role: "user", expiresAt: new Date() });
  warn.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getMyProfile", () => {
  // ----- 正常系 -----
  it("契約の応答を表示用のプロフィールへ写す", async () => {
    stubFetch(json(wireUser));

    await expect(getMyProfile()).resolves.toEqual(profile);
  });

  it("内部の識別子を画面へ渡さない", async () => {
    stubFetch(json(wireUser));

    await expect(getMyProfile()).resolves.not.toHaveProperty("id");
  });

  it("退会日時を画面へ渡さない", async () => {
    stubFetch(json(wireUser));

    await expect(getMyProfile()).resolves.not.toHaveProperty("deletedAt");
  });

  it("建物名の無い利用者の建物名を null にする", async () => {
    stubFetch(json({ ...wireUser, building: undefined }));

    await expect(getMyProfile()).resolves.toMatchObject({ building: null });
  });

  it("自分を指す口を認証ヘッダつきで叩く", async () => {
    const fetchImpl = stubFetch(json(wireUser));

    await getMyProfile();

    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://api.example.test/v1/users/me");
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      headers: { Authorization: "Bearer access-token" },
    });
  });

  // ----- 異常系 -----
  it("認証できないとき取得へ出さず未認証として投げる", async () => {
    const fetchImpl = stubFetch(json(wireUser));
    getAccessToken.mockResolvedValue(null);

    await expect(kindOf(getMyProfile)).resolves.toBe(ErrorKind.UNAUTHENTICATED);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("応答が契約と一致しないとき internal として投げる", async () => {
    stubFetch(json({ ...wireUser, email: "メールではない" }));

    await expect(kindOf(getMyProfile)).resolves.toBe(ErrorKind.INTERNAL);
  });
});

describe("getMyPurchaseSummary", () => {
  // ----- 正常系 -----
  it("契約の集計を表示用の内訳へ写す", async () => {
    stubFetch(json(wireSummary));

    await expect(getMyPurchaseSummary()).resolves.toEqual({
      totalCount: 3,
      totalAmount: 300_000,
      breakdown: [
        {
          statusId: "0195f0c2-0000-7000-8000-0000000000b1",
          statusName: "発送済み",
          count: 2,
          totalAmount: 200_000,
        },
        {
          statusId: "0195f0c2-0000-7000-8000-0000000000b2",
          statusName: "配達済み",
          count: 1,
          totalAmount: 100_000,
        },
      ],
    });
  });

  it("集計の口を叩く", async () => {
    const fetchImpl = stubFetch(json(wireSummary));

    await getMyPurchaseSummary();

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api.example.test/v1/users/me/purchases/summary",
    );
  });

  it("契約が返した表示順のまま内訳を保つ", async () => {
    stubFetch(
      json({ ...wireSummary, statusBreakdown: [...wireSummary.statusBreakdown].reverse() }),
    );

    const summary = await getMyPurchaseSummary();

    expect(summary.breakdown.map(({ statusName }) => statusName)).toEqual(["配達済み", "発送済み"]);
  });

  it("購入が 1 件も無いときゼロ値と空の内訳を返す", async () => {
    stubFetch(
      json({
        period: { from: null, to: null },
        totalCount: 0,
        totalAmount: 0,
        itemsTotal: "0",
        statusBreakdown: [],
      }),
    );

    await expect(getMyPurchaseSummary()).resolves.toEqual({
      totalCount: 0,
      totalAmount: 0,
      breakdown: [],
    });
  });

  // ----- 異常系 -----
  it("応答が契約と一致しないとき internal として投げる", async () => {
    stubFetch(json({ ...wireSummary, totalCount: "3" }));

    await expect(kindOf(getMyPurchaseSummary)).resolves.toBe(ErrorKind.INTERNAL);
  });
});

describe("updateMyProfile", () => {
  // ----- 正常系 -----
  it("更新後のプロフィールを表示用の型で返す", async () => {
    stubFetch(json(wireUser), json({ ...wireUser, city: "港区" }));

    await expect(updateMyProfile({ ...profile, city: "港区" })).resolves.toMatchObject({
      city: "港区",
    });
  });

  it("自分の識別子を解決してから対象の口を PUT で叩く", async () => {
    const fetchImpl = stubFetch(json(wireUser), json(wireUser));

    await updateMyProfile(profile);

    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://api.example.test/v1/users/me");
    expect(fetchImpl.mock.calls[1]?.[0]).toBe(`https://api.example.test/v1/users/${USER_ID}`);
    expect(fetchImpl.mock.calls[1]?.[1]).toMatchObject({ method: "PUT" });
  });

  it("契約が要求する全項目を本文へ載せる", async () => {
    const fetchImpl = stubFetch(json(wireUser), json(wireUser));

    await updateMyProfile(profile);

    expect(JSON.parse(String(fetchImpl.mock.calls[1]?.[1]?.body))).toEqual(profile);
  });

  it("建物名が空でも項目ごと落とさずに送る", async () => {
    const fetchImpl = stubFetch(json(wireUser), json({ ...wireUser, building: undefined }));

    await updateMyProfile({ ...profile, building: null });

    expect(JSON.parse(String(fetchImpl.mock.calls[1]?.[1]?.body))).toMatchObject({
      building: null,
    });
  });

  it("建物名の無い応答の建物名を null にする", async () => {
    stubFetch(json(wireUser), json({ ...wireUser, building: undefined }));

    await expect(updateMyProfile(profile)).resolves.toMatchObject({ building: null });
  });

  // ----- 異常系 -----
  it("識別子を解決できないとき更新を送らない", async () => {
    const fetchImpl = stubFetch(json({ ...wireUser, email: "メールではない" }));

    await expect(kindOf(() => updateMyProfile(profile))).resolves.toBe(ErrorKind.INTERNAL);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("更新が拒まれたときその分類のまま投げる", async () => {
    stubFetch(json(wireUser), () => new Response("{}", { status: 409 }));

    await expect(kindOf(() => updateMyProfile(profile))).resolves.toBe(ErrorKind.CONFLICT);
  });
});

describe("withdrawMe", () => {
  // ----- 正常系 -----
  it("自分の識別子を解決してから対象の口を DELETE で叩く", async () => {
    const fetchImpl = stubFetch(json(wireUser), noContent());

    await withdrawMe();

    expect(fetchImpl.mock.calls[1]?.[0]).toBe(`https://api.example.test/v1/users/${USER_ID}`);
    expect(fetchImpl.mock.calls[1]?.[1]).toMatchObject({ method: "DELETE" });
  });

  it("退会が成立したら続けて session を終わらせる", async () => {
    stubFetch(json(wireUser), noContent());

    await withdrawMe();

    expect(signOut).toHaveBeenCalledOnce();
  });

  // ----- 異常系 -----
  it("IdP 側の終了に失敗しても退会は成立として返し、記録を残す", async () => {
    stubFetch(json(wireUser), noContent());
    signOut.mockRejectedValue(new Error("idp down"));

    await expect(withdrawMe()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      "退会後の IdP session 終了に失敗しました",
      expect.objectContaining({ cause: expect.stringContaining("idp down") }),
    );
  });

  it("識別子を解決できないとき退会を送らない", async () => {
    const fetchImpl = stubFetch(json({ ...wireUser, email: "メールではない" }));

    await expect(kindOf(withdrawMe)).resolves.toBe(ErrorKind.INTERNAL);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("進行中の購入が残って拒まれたとき session を終わらせずに投げる", async () => {
    stubFetch(json(wireUser), () => new Response("{}", { status: 409 }));

    await expect(kindOf(withdrawMe)).resolves.toBe(ErrorKind.CONFLICT);
    expect(signOut).not.toHaveBeenCalled();
  });
});

describe("findMyProfile", () => {
  // ----- 正常系 -----
  it("登録済みならプロフィールを返す", async () => {
    stubFetch(json(wireUser));

    await expect(findMyProfile()).resolves.toEqual(profile);
  });

  // ----- 異常系 -----
  it("まだ登録していない主体は、失敗ではなく null として返す", async () => {
    stubFetch(failure(404));

    await expect(findMyProfile()).resolves.toBeNull();
  });

  it("登録の有無と関係の無い失敗はそのまま投げる", async () => {
    stubFetch(failure(503));

    expect(await kindOf(() => findMyProfile())).toBe(ErrorKind.UNAVAILABLE);
  });
});

describe("findRegistration", () => {
  // ----- 正常系 -----
  it("身元があり記録もあれば登録済みと答える", async () => {
    stubFetch(json(wireUser));

    await expect(findRegistration()).resolves.toBe("registered");
  });

  it("身元はあるが記録が無ければ未登録と答える", async () => {
    stubFetch(failure(404));

    await expect(findRegistration()).resolves.toBe("unregistered");
  });

  // ----- 異常系 -----
  it("身元が無ければ未認証と答える", async () => {
    verifySession.mockResolvedValue(null);
    const fetchImpl = stubFetch(json(wireUser));

    await expect(findRegistration()).resolves.toBe("unauthenticated");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("registerUser", () => {
  // ----- 正常系 -----
  it("入力を契約の形で送る", async () => {
    const fetchImpl = stubFetch(json({ ...wireUser, deletedAt: null }));

    await registerUser(profile, "0195f0c2-0000-7000-8000-00000000000f");

    const [url, init] = fetchImpl.mock.calls[0] ?? [];

    expect(url).toBe("https://api.example.test/v1/users");
    expect(init).toMatchObject({ method: "POST" });
    expect(JSON.parse(String(init?.body))).toEqual(profile);
  });

  it("渡された冪等キーをヘッダへ載せる", async () => {
    const fetchImpl = stubFetch(json(wireUser));

    await registerUser(profile, "0195f0c2-0000-7000-8000-00000000000f");

    expect(new Headers(fetchImpl.mock.calls[0]?.[1]?.headers).get("Idempotency-Key")).toBe(
      "0195f0c2-0000-7000-8000-00000000000f",
    );
  });

  // ----- 異常系 -----
  it("競合はそのまま分類として投げる", async () => {
    stubFetch(failure(409));

    expect(await kindOf(() => registerUser(profile, "0195f0c2-0000-7000-8000-00000000000f"))).toBe(
      ErrorKind.CONFLICT,
    );
  });
});
