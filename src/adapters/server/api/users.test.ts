import { beforeEach, describe, expect, it, vi } from "vitest";
import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { serveJson, serveStatus, serveWrite } from "../../../../vitest.setup";

const { getAccessToken, getEnvironment, getLogger, signOut, warn } = vi.hoisted(() => {
  const warnFn = vi.fn();

  return {
    getAccessToken: vi.fn(async (): Promise<string | null> => "access-token"),
    getEnvironment: vi.fn(() => PARSED_ENVIRONMENT),
    getLogger: vi.fn(() => ({ warn: warnFn })),
    signOut: vi.fn(async (): Promise<void> => undefined),
    warn: warnFn,
  };
});

vi.mock("@/config/environment", () => ({ getEnvironment }));
vi.mock("@/logging/logging.server", () => ({ getLogger }));
vi.mock("../auth/session", () => ({ getAccessToken, signOut }));

import { getMyProfile, getMyPurchaseSummary, updateMyProfile, withdrawMe } from "./users";

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
