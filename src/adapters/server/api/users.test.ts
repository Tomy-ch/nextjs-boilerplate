import { beforeEach, describe, expect, it, vi } from "vitest";
import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { toUserId } from "@/model/user/user";
import { serveJson, serveStatus, serveWrite } from "../../../../vitest.setup";

const { getAccessToken, getEnvironment, getLogger, signOut, verifySession, warn } = vi.hoisted(
  () => {
    const warnFn = vi.fn();

    return {
      getAccessToken: vi.fn(async (): Promise<string | null> => "access-token"),
      getEnvironment: vi.fn(() => PARSED_ENVIRONMENT),
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
  getManagedUserPage,
  getMyProfile,
  getMyPurchaseSummary,
  MANAGED_USER_PER_PAGE,
  registerUser,
  updateMyProfile,
  withdrawMe,
  withdrawUser,
} from "./users";

/** 更新と退会が対象を指すのに使う内部の識別子。画面へは出さない。 */
const USER_ID = "0195f0c2-0000-7000-8000-0000000000a1";

const USERS_URL = `${PARSED_ENVIRONMENT.APP_API_BASE_URL}/v1/users`;

/** 自分を指す口。更新と退会は、まずここで識別子を解決してから対象の口を叩く。 */
const ME_URL = `${USERS_URL}/me`;
const SUMMARY_URL = `${ME_URL}/purchases/summary`;
const USER_URL = `${USERS_URL}/:userId`;

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

/** 登録 1 回ぶんを指す鍵。契約は表示可能 ASCII を要求する。 */
const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-8000-00000000000f";

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

describe("getMyProfile", () => {
  // ----- 正常系 -----
  it("契約の応答を表示用のプロフィールへ写す", async () => {
    serveJson(ME_URL, wireUser);

    await expect(getMyProfile()).resolves.toEqual(profile);
  });

  it("内部の識別子を画面へ渡さない", async () => {
    serveJson(ME_URL, wireUser);

    await expect(getMyProfile()).resolves.not.toHaveProperty("id");
  });

  it("退会日時を画面へ渡さない", async () => {
    serveJson(ME_URL, wireUser);

    await expect(getMyProfile()).resolves.not.toHaveProperty("deletedAt");
  });

  it("建物名の無い利用者の建物名を null にする", async () => {
    serveJson(ME_URL, { ...wireUser, building: undefined });

    await expect(getMyProfile()).resolves.toMatchObject({ building: null });
  });

  it("自分を指す口を認証ヘッダつきで叩く", async () => {
    const requests = serveJson(ME_URL, wireUser);

    await getMyProfile();

    expect(requests[0]?.url).toBe(ME_URL);
    expect(requests[0]?.headers.get("Authorization")).toBe("Bearer access-token");
  });

  // ----- 異常系 -----
  it("認証できないとき取得へ出さず未認証として投げる", async () => {
    const requests = serveJson(ME_URL, wireUser);
    getAccessToken.mockResolvedValue(null);

    await expect(kindOf(getMyProfile)).resolves.toBe(ErrorKind.UNAUTHENTICATED);
    expect(requests).toHaveLength(0);
  });

  it("応答が契約と一致しないとき internal として投げる", async () => {
    serveJson(ME_URL, { ...wireUser, email: "メールではない" });

    await expect(kindOf(getMyProfile)).resolves.toBe(ErrorKind.INTERNAL);
  });
});

describe("getMyPurchaseSummary", () => {
  // ----- 正常系 -----
  it("契約の集計を表示用の内訳へ写す", async () => {
    serveJson(SUMMARY_URL, wireSummary);

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
    const requests = serveJson(SUMMARY_URL, wireSummary);

    await getMyPurchaseSummary();

    expect(requests[0]?.url).toBe(SUMMARY_URL);
  });

  it("契約が返した表示順のまま内訳を保つ", async () => {
    serveJson(SUMMARY_URL, {
      ...wireSummary,
      statusBreakdown: [...wireSummary.statusBreakdown].reverse(),
    });

    const summary = await getMyPurchaseSummary();

    expect(summary.breakdown.map(({ statusName }) => statusName)).toEqual(["配達済み", "発送済み"]);
  });

  it("購入が 1 件も無いときゼロ値と空の内訳を返す", async () => {
    serveJson(SUMMARY_URL, {
      period: { from: null, to: null },
      totalCount: 0,
      totalAmount: 0,
      itemsTotal: "0",
      statusBreakdown: [],
    });

    await expect(getMyPurchaseSummary()).resolves.toEqual({
      totalCount: 0,
      totalAmount: 0,
      breakdown: [],
    });
  });

  // ----- 異常系 -----
  it("応答が契約と一致しないとき internal として投げる", async () => {
    serveJson(SUMMARY_URL, { ...wireSummary, totalCount: "3" });

    await expect(kindOf(getMyPurchaseSummary)).resolves.toBe(ErrorKind.INTERNAL);
  });
});

describe("updateMyProfile", () => {
  // ----- 正常系 -----
  it("更新後のプロフィールを表示用の型で返す", async () => {
    serveJson(ME_URL, wireUser);
    serveWrite("put", USER_URL, { ...wireUser, city: "港区" });

    await expect(updateMyProfile({ ...profile, city: "港区" })).resolves.toMatchObject({
      city: "港区",
    });
  });

  it("自分の識別子を解決してから対象の口を PUT で叩く", async () => {
    const resolved = serveJson(ME_URL, wireUser);
    const updates = serveWrite("put", USER_URL, wireUser);

    await updateMyProfile(profile);

    expect(resolved[0]?.url).toBe(ME_URL);
    expect(updates[0]?.url).toBe(`${USERS_URL}/${USER_ID}`);
    expect(updates[0]?.method).toBe("PUT");
  });

  it("契約が要求する全項目を本文へ載せる", async () => {
    serveJson(ME_URL, wireUser);
    const updates = serveWrite("put", USER_URL, wireUser);

    await updateMyProfile(profile);

    await expect(updates[0]?.json()).resolves.toEqual(profile);
  });

  it("建物名が空でも項目ごと落とさずに送る", async () => {
    serveJson(ME_URL, wireUser);
    const updates = serveWrite("put", USER_URL, { ...wireUser, building: undefined });

    await updateMyProfile({ ...profile, building: null });

    await expect(updates[0]?.json()).resolves.toMatchObject({ building: null });
  });

  it("建物名の無い応答の建物名を null にする", async () => {
    serveJson(ME_URL, wireUser);
    serveWrite("put", USER_URL, { ...wireUser, building: undefined });

    await expect(updateMyProfile(profile)).resolves.toMatchObject({ building: null });
  });

  // ----- 異常系 -----
  it("識別子を解決できないとき更新を送らない", async () => {
    serveJson(ME_URL, { ...wireUser, email: "メールではない" });
    const updates = serveWrite("put", USER_URL, wireUser);

    await expect(kindOf(() => updateMyProfile(profile))).resolves.toBe(ErrorKind.INTERNAL);
    expect(updates).toHaveLength(0);
  });

  it("更新が拒まれたときその分類のまま投げる", async () => {
    serveJson(ME_URL, wireUser);
    serveStatus("put", USER_URL, 409);

    await expect(kindOf(() => updateMyProfile(profile))).resolves.toBe(ErrorKind.CONFLICT);
  });
});

describe("withdrawMe", () => {
  // ----- 正常系 -----
  it("自分の識別子を解決してから対象の口を DELETE で叩く", async () => {
    serveJson(ME_URL, wireUser);
    const withdrawals = serveStatus("delete", USER_URL, 204);

    await withdrawMe();

    expect(withdrawals[0]?.url).toBe(`${USERS_URL}/${USER_ID}`);
    expect(withdrawals[0]?.method).toBe("DELETE");
  });

  it("退会が成立したら続けて session を終わらせる", async () => {
    serveJson(ME_URL, wireUser);
    serveStatus("delete", USER_URL, 204);

    await withdrawMe();

    expect(signOut).toHaveBeenCalledOnce();
  });

  // ----- 異常系 -----
  it("IdP 側の終了に失敗しても退会は成立として返し、記録を残す", async () => {
    serveJson(ME_URL, wireUser);
    serveStatus("delete", USER_URL, 204);
    signOut.mockRejectedValue(new Error("idp down"));

    await expect(withdrawMe()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      "退会後の IdP session 終了に失敗しました",
      expect.objectContaining({ cause: expect.stringContaining("idp down") }),
    );
  });

  it("識別子を解決できないとき退会を送らない", async () => {
    serveJson(ME_URL, { ...wireUser, email: "メールではない" });
    const withdrawals = serveStatus("delete", USER_URL, 204);

    await expect(kindOf(withdrawMe)).resolves.toBe(ErrorKind.INTERNAL);
    expect(withdrawals).toHaveLength(0);
  });

  it("進行中の購入が残って拒まれたとき session を終わらせずに投げる", async () => {
    serveJson(ME_URL, wireUser);
    serveStatus("delete", USER_URL, 409);

    await expect(kindOf(withdrawMe)).resolves.toBe(ErrorKind.CONFLICT);
    expect(signOut).not.toHaveBeenCalled();
  });
});

describe("findMyProfile", () => {
  // ----- 正常系 -----
  it("登録済みならプロフィールを返す", async () => {
    serveJson(ME_URL, wireUser);

    await expect(findMyProfile()).resolves.toEqual(profile);
  });

  // ----- 異常系 -----
  it("まだ登録していない主体は、失敗ではなく null として返す", async () => {
    serveStatus("get", ME_URL, 404);

    await expect(findMyProfile()).resolves.toBeNull();
  });

  it("登録の有無と関係の無い失敗はそのまま投げる", async () => {
    serveStatus("get", ME_URL, 503);

    expect(await kindOf(() => findMyProfile())).toBe(ErrorKind.UNAVAILABLE);
  });
});

describe("findRegistration", () => {
  // ----- 正常系 -----
  it("身元があり記録もあれば登録済みと答える", async () => {
    serveJson(ME_URL, wireUser);

    await expect(findRegistration()).resolves.toBe("registered");
  });

  it("身元はあるが記録が無ければ未登録と答える", async () => {
    serveStatus("get", ME_URL, 404);

    await expect(findRegistration()).resolves.toBe("unregistered");
  });

  // ----- 異常系 -----
  it("身元が無ければ、記録を引かずに未認証と答える", async () => {
    verifySession.mockResolvedValue(null);
    const requests = serveJson(ME_URL, wireUser);

    await expect(findRegistration()).resolves.toBe("unauthenticated");
    expect(requests).toHaveLength(0);
  });
});

describe("registerUser", () => {
  // ----- 正常系 -----
  it("入力を契約の形で送る", async () => {
    const requests = serveWrite("post", USERS_URL, wireUser);

    await registerUser(profile, IDEMPOTENCY_KEY);

    expect(requests[0]?.method).toBe("POST");
    await expect(requests[0]?.json()).resolves.toEqual(profile);
  });

  it("渡された冪等キーをヘッダへ載せる", async () => {
    const requests = serveWrite("post", USERS_URL, wireUser);

    await registerUser(profile, IDEMPOTENCY_KEY);

    expect(requests[0]?.headers.get("Idempotency-Key")).toBe(IDEMPOTENCY_KEY);
  });

  // ----- 異常系 -----
  it("競合はそのまま分類として投げる", async () => {
    serveStatus("post", USERS_URL, 409);

    expect(await kindOf(() => registerUser(profile, IDEMPOTENCY_KEY))).toBe(ErrorKind.CONFLICT);
  });
});

describe("getManagedUserPage", () => {
  // ----- 正常系 -----
  it("契約の応答を、位置と全件数を持つ 1 ページへ写す", async () => {
    serveJson(USERS_URL, { users: [wireUser], total: 45, limit: 20, offset: 20 });

    await expect(getManagedUserPage({ page: 2 })).resolves.toEqual({
      items: [
        {
          id: USER_ID,
          firstName: "太郎",
          lastName: "山田",
          email: "taro@example.com",
          phone: "09012345678",
          deletedAt: null,
        },
      ],
      total: 45,
      perPage: 20,
      offset: 20,
    });
  });

  it("ページ番号と 1 ページの件数をクエリへ載せる", async () => {
    const requests = serveJson(USERS_URL, { users: [], total: 0, limit: 20, offset: 0 });

    await getManagedUserPage({ page: 3 });

    const url = new URL(requests[0]?.url ?? "");

    expect(url.searchParams.get("page")).toBe("3");
    expect(url.searchParams.get("perPage")).toBe(String(MANAGED_USER_PER_PAGE));
  });

  it("有効だけを求めるとき active を真として送る", async () => {
    const requests = serveJson(USERS_URL, { users: [], total: 0, limit: 20, offset: 0 });

    await getManagedUserPage({ page: 1, active: true });

    expect(new URL(requests[0]?.url ?? "").searchParams.get("active")).toBe("true");
  });

  it("退会済みだけを求めるとき active を偽として送る", async () => {
    const requests = serveJson(USERS_URL, { users: [], total: 0, limit: 20, offset: 0 });

    await getManagedUserPage({ page: 1, active: false });

    expect(new URL(requests[0]?.url ?? "").searchParams.get("active")).toBe("false");
  });

  it("区別しないときは active そのものを送らない", async () => {
    const requests = serveJson(USERS_URL, { users: [], total: 0, limit: 20, offset: 0 });

    await getManagedUserPage({ page: 1 });

    expect(new URL(requests[0]?.url ?? "").searchParams.has("active")).toBe(false);
  });

  it("退会済みの利用者は退会日時を伴って届く", async () => {
    serveJson(USERS_URL, {
      users: [{ ...wireUser, deletedAt: "2026-08-01T00:00:00Z" }],
      total: 1,
      limit: 20,
      offset: 0,
    });

    await expect(
      getManagedUserPage({ page: 1 }).then((page) => page.items[0]?.deletedAt),
    ).resolves.toBe("2026-08-01T00:00:00Z");
  });

  // ----- 異常系 -----
  it("契約が拒む条件は送る前に止める", async () => {
    const requests = serveJson(USERS_URL, { users: [], total: 0, limit: 20, offset: 0 });

    await expect(getManagedUserPage({ page: 0 })).rejects.toThrow();
    expect(requests).toHaveLength(0);
  });

  it("役割が足りなければ、その分類のまま投げる", async () => {
    serveStatus("get", USERS_URL, 403);

    await expect(kindOf(() => getManagedUserPage({ page: 1 }))).resolves.toBe(
      ErrorKind.PERMISSION_DENIED,
    );
  });
});

describe("withdrawUser", () => {
  // ----- 正常系 -----
  it("受け取った識別子の口を DELETE で叩く", async () => {
    const withdrawals = serveStatus("delete", USER_URL, 204);

    await withdrawUser(toUserId(USER_ID));

    expect(withdrawals[0]?.url).toBe(`${USERS_URL}/${USER_ID}`);
    expect(withdrawals[0]?.method).toBe("DELETE");
  });

  it("操作した側の session は畳まない", async () => {
    serveStatus("delete", USER_URL, 204);

    await withdrawUser(toUserId(USER_ID));

    expect(signOut).not.toHaveBeenCalled();
  });

  it("自分の識別子を解決しない", async () => {
    const me = serveJson(ME_URL, wireUser);
    serveStatus("delete", USER_URL, 204);

    await withdrawUser(toUserId(USER_ID));

    expect(me).toHaveLength(0);
  });

  // ----- 異常系 -----
  it("進行中の購入が残って拒まれたら、その分類のまま投げる", async () => {
    serveStatus("delete", USER_URL, 409);

    await expect(kindOf(() => withdrawUser(toUserId(USER_ID)))).resolves.toBe(ErrorKind.CONFLICT);
  });

  it("役割が足りなければ、その分類のまま投げる", async () => {
    serveStatus("delete", USER_URL, 403);

    await expect(kindOf(() => withdrawUser(toUserId(USER_ID)))).resolves.toBe(
      ErrorKind.PERMISSION_DENIED,
    );
  });
});
