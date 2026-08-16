import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookies, get, set, deleteCookie, getAuthConfig } = vi.hoisted(() => {
  const getFn = vi.fn();
  const setFn = vi.fn();
  const deleteFn = vi.fn();

  return {
    cookies: vi.fn(async () => ({ get: getFn, set: setFn, delete: deleteFn })),
    get: getFn,
    set: setFn,
    deleteCookie: deleteFn,
    getAuthConfig: vi.fn(() => ({ redirectUri: "https://app.example.test/api/auth/callback" })),
  };
});

vi.mock("next/headers", () => ({ cookies }));
vi.mock("@/config/auth/auth.server", () => ({ getAuthConfig }));

import { clearCartSession, readCartSession, storeCartSession } from "./cart-session";

const TOKEN = "2LOUdXuXEQ7Yg2nJRAgDA9yQbLyjGvoITuwDse3u9Z0";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("readCartSession", () => {
  // ----- 正常系 -----
  it("発行済みの識別子を返す", async () => {
    get.mockReturnValue({ value: TOKEN });

    await expect(readCartSession()).resolves.toBe(TOKEN);
  });

  // ----- 異常系 -----
  it("cookie が無いとき null を返す", async () => {
    get.mockReturnValue(undefined);

    await expect(readCartSession()).resolves.toBeNull();
  });

  it("cookie が空のとき、持っていないものとして null を返す", async () => {
    get.mockReturnValue({ value: "" });

    await expect(readCartSession()).resolves.toBeNull();
  });
});

describe("storeCartSession", () => {
  // ----- 正常系 -----
  it("有効期限までの秒数を寿命にして載せる", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T00:00:00.000Z"));

    await storeCartSession(TOKEN, new Date("2026-08-17T00:01:40.000Z"));

    expect(set).toHaveBeenCalledWith(
      "cart_session",
      TOKEN,
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 100 }),
    );
  });

  it("配信が https のとき secure を付ける", async () => {
    await storeCartSession(TOKEN, null);

    expect(set).toHaveBeenCalledWith(
      "cart_session",
      TOKEN,
      expect.objectContaining({ secure: true }),
    );
  });

  it("有効期限が判らないとき、寿命を指定しない", async () => {
    await storeCartSession(TOKEN, null);

    expect(set.mock.calls[0]?.[2]).toMatchObject({ maxAge: undefined });
  });

  // ----- 異常系 -----
  it("有効期限が過ぎているとき、寿命を 0 にする", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T00:00:00.000Z"));

    await storeCartSession(TOKEN, new Date("2026-08-16T00:00:00.000Z"));

    expect(set.mock.calls[0]?.[2]).toMatchObject({ maxAge: 0 });
  });
});

describe("clearCartSession", () => {
  // ----- 正常系 -----
  it("識別子の cookie を破棄する", async () => {
    await clearCartSession();

    expect(deleteCookie).toHaveBeenCalledWith("cart_session");
  });
});
