import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_ROLE } from "@/model/session";
import {
  getAccessToken,
  signOut,
  storeSession,
  storeTransaction,
  takeTransaction,
  verifySession,
} from "./session";

const cookieStore = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}));
const resolver = vi.hoisted(() => ({
  restore: vi.fn(),
  seal: vi.fn(),
  endSession: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));
vi.mock("./resolver", () => ({ getSessionResolver: () => resolver }));
vi.mock("@/config/auth/auth.server", () => ({
  getAuthConfig: () => ({ redirectUri: "http://localhost:3000/api/auth/callback" }),
}));

const session = {
  userId: "user-1",
  role: SESSION_ROLE.user,
  expiresAt: new Date(Date.now() + 3600 * 1000),
};
const record = { session, accessToken: "access-token", idToken: "id-token" };

const transaction = {
  state: "state-value",
  codeVerifier: "verifier-value",
  nonce: "nonce-value",
  returnUrl: "/products",
};

beforeEach(() => {
  vi.clearAllMocks();
  cookieStore.get.mockReturnValue(undefined);
  resolver.restore.mockResolvedValue(null);
});

describe("verifySession", () => {
  // ----- 正常系 -----
  it("cookie から復元した身元を返す", async () => {
    cookieStore.get.mockReturnValue({ value: "sealed" });
    resolver.restore.mockResolvedValue(record);

    expect(await verifySession()).toEqual(session);
  });

  // ----- 異常系 -----
  it("cookie が無ければ null にする", async () => {
    expect(await verifySession()).toBeNull();
  });

  it("復元できなければ null にする", async () => {
    cookieStore.get.mockReturnValue({ value: "broken" });

    expect(await verifySession()).toBeNull();
  });
});

describe("getAccessToken", () => {
  // ----- 正常系 -----
  it("復元した Bearer を返す", async () => {
    cookieStore.get.mockReturnValue({ value: "sealed" });
    resolver.restore.mockResolvedValue(record);

    expect(await getAccessToken()).toBe("access-token");
  });

  // ----- 異常系 -----
  it("未認証なら null にする", async () => {
    expect(await getAccessToken()).toBeNull();
  });
});

describe("storeSession", () => {
  // ----- 正常系 -----
  it("封緘した値を session の cookie へ載せる", async () => {
    resolver.seal.mockResolvedValue("sealed-value");

    await storeSession(record);

    expect(cookieStore.set).toHaveBeenCalledWith(
      "auth_session",
      "sealed-value",
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
    );
  });

  it("cookie の寿命を session の失効時刻に合わせる", async () => {
    resolver.seal.mockResolvedValue("sealed-value");

    await storeSession(record);

    const options = cookieStore.set.mock.calls[0]?.[2];

    expect(options?.maxAge).toBeGreaterThan(3500);
    expect(options?.maxAge).toBeLessThanOrEqual(3600);
  });

  // ----- 異常系 -----
  it("失効済みの session なら寿命を 0 にする", async () => {
    resolver.seal.mockResolvedValue("sealed-value");

    await storeSession({ ...record, session: { ...session, expiresAt: new Date(0) } });

    expect(cookieStore.set.mock.calls[0]?.[2]).toMatchObject({ maxAge: 0 });
  });
});

describe("signOut", () => {
  // ----- 正常系 -----
  it("session の cookie を破棄する", async () => {
    await signOut();

    expect(cookieStore.delete).toHaveBeenCalledWith("auth_session");
  });

  it("復元できた session は IdP 側も終わらせる", async () => {
    cookieStore.get.mockReturnValue({ value: "sealed" });
    resolver.restore.mockResolvedValue(record);

    await signOut();

    expect(resolver.endSession).toHaveBeenCalledWith(record);
  });

  // ----- 異常系 -----
  it("未認証なら IdP へ何も送らない", async () => {
    await signOut();

    expect(resolver.endSession).not.toHaveBeenCalled();
  });

  it("IdP 側の終了に失敗しても cookie は破棄済みにする", async () => {
    cookieStore.get.mockReturnValue({ value: "sealed" });
    resolver.restore.mockResolvedValue(record);
    resolver.endSession.mockRejectedValue(new Error("IdP が応答しません"));

    await expect(signOut()).rejects.toThrow();
    expect(cookieStore.delete).toHaveBeenCalledWith("auth_session");
  });
});

describe("storeTransaction", () => {
  // ----- 正常系 -----
  it("一時状態を短い寿命の cookie へ載せる", async () => {
    await storeTransaction(transaction);

    expect(cookieStore.set).toHaveBeenCalledWith(
      "auth_tx",
      JSON.stringify(transaction),
      expect.objectContaining({ httpOnly: true, maxAge: 600 }),
    );
  });
});

describe("takeTransaction", () => {
  // ----- 正常系 -----
  it("保存した一時状態を返す", async () => {
    cookieStore.get.mockReturnValue({ value: JSON.stringify(transaction) });

    expect(await takeTransaction()).toEqual(transaction);
  });

  it("取り出しと同時に破棄する", async () => {
    cookieStore.get.mockReturnValue({ value: JSON.stringify(transaction) });

    await takeTransaction();

    expect(cookieStore.delete).toHaveBeenCalledWith("auth_tx");
  });

  // ----- 異常系 -----
  it("cookie が無ければ null にする", async () => {
    expect(await takeTransaction()).toBeNull();
  });

  it("解釈できない値でも cookie を破棄する", async () => {
    cookieStore.get.mockReturnValue({ value: "{" });

    expect(await takeTransaction()).toBeNull();
    expect(cookieStore.delete).toHaveBeenCalledWith("auth_tx");
  });
});
