import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_ROLE } from "@/model/session";
import { GET } from "./route";

const completeAuthorization = vi.hoisted(() => vi.fn());
const storeSession = vi.hoisted(() => vi.fn());
const takeTransaction = vi.hoisted(() => vi.fn());
const mergeGuestCart = vi.hoisted(() => vi.fn());
const logger = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn() }));

vi.mock("@/adapters/server/auth/resolver", () => ({
  getSessionResolver: () => ({ completeAuthorization }),
}));
vi.mock("@/adapters/server/auth/session", () => ({ storeSession, takeTransaction }));
vi.mock("@/adapters/server/api/cart", () => ({ mergeGuestCart }));
vi.mock("@/logging/logging.server", () => ({ getLogger: () => logger }));

const transaction = {
  state: "state-value",
  codeVerifier: "verifier-value",
  nonce: "nonce-value",
  returnUrl: "/mypage",
};

const record = {
  session: {
    userId: "user-1",
    role: SESSION_ROLE.user,
    expiresAt: new Date("2026-08-14T01:00:00.000Z"),
  },
  accessToken: "access-token",
  idToken: "id-token",
};

function callback(query: string): Request {
  return new Request(`http://localhost:3000/api/auth/callback${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  takeTransaction.mockResolvedValue(transaction);
  completeAuthorization.mockResolvedValue(record);
  mergeGuestCart.mockResolvedValue(null);
});

describe("GET", () => {
  // ----- 正常系 -----
  it("認可コードを交換して session を保存する", async () => {
    await GET(callback("?code=authorization-code&state=state-value"));

    expect(completeAuthorization).toHaveBeenCalledWith({
      code: "authorization-code",
      state: "state-value",
      transaction,
    });
    expect(storeSession).toHaveBeenCalledWith(record);
  });

  it("session を確立した後に、ゲストのカートを引き継ぐ", async () => {
    await GET(callback("?code=authorization-code&state=state-value"));

    expect(mergeGuestCart).toHaveBeenCalledOnce();
  });

  it("引き継げなかった明細があれば記録に残す", async () => {
    mergeGuestCart.mockResolvedValue({ clampedProductIds: ["p-1"], droppedProductIds: [] });

    await GET(callback("?code=authorization-code&state=state-value"));

    expect(logger.info).toHaveBeenCalledWith(expect.any(String), { clamped: 1, dropped: 0 });
  });

  it("すべて引き継げたときは記録を残さない", async () => {
    mergeGuestCart.mockResolvedValue({ clampedProductIds: [], droppedProductIds: [] });

    await GET(callback("?code=authorization-code&state=state-value"));

    expect(logger.info).not.toHaveBeenCalled();
  });

  it("元の画面へ戻す", async () => {
    const response = await GET(callback("?code=authorization-code&state=state-value"));

    expect(response.headers.get("location")).toBe("http://localhost:3000/mypage");
  });

  // ----- 異常系 -----
  it("認可コードが無ければログインへ戻す", async () => {
    const response = await GET(callback("?state=state-value"));

    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    expect(completeAuthorization).not.toHaveBeenCalled();
  });

  it("一時状態が無ければ交換しない", async () => {
    takeTransaction.mockResolvedValue(null);

    const response = await GET(callback("?code=authorization-code&state=state-value"));

    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    expect(completeAuthorization).not.toHaveBeenCalled();
  });

  it("交換に失敗すればログインへ戻し、理由を持ち出さない", async () => {
    completeAuthorization.mockRejectedValue(new Error("state が一致しません"));

    const response = await GET(callback("?code=authorization-code&state=forged"));

    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    expect(storeSession).not.toHaveBeenCalled();
  });

  it("カートを引き継げなくてもログインは成功させる", async () => {
    mergeGuestCart.mockRejectedValue(new Error("上流が応答しません"));

    const response = await GET(callback("?code=authorization-code&state=state-value"));

    expect(response.headers.get("location")).toBe("http://localhost:3000/mypage");
    expect(logger.warn).toHaveBeenCalled();
  });

  it("記録そのものが失敗してもログインは成功させる", async () => {
    mergeGuestCart.mockRejectedValue(new Error("上流が応答しません"));
    logger.warn.mockImplementation(() => {
      throw new Error("logger は初期化されていません");
    });

    const response = await GET(callback("?code=authorization-code&state=state-value"));

    expect(response.headers.get("location")).toBe("http://localhost:3000/mypage");
  });

  it("一時状態の復帰先が外部 URL でも自分の中へ戻す", async () => {
    takeTransaction.mockResolvedValue({ ...transaction, returnUrl: "https://evil.example.test" });

    const response = await GET(callback("?code=authorization-code&state=state-value"));

    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });
});
