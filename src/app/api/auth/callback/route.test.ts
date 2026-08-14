import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_ROLE } from "@/model/session";
import { GET } from "./route";

const completeAuthorization = vi.hoisted(() => vi.fn());
const storeSession = vi.hoisted(() => vi.fn());
const takeTransaction = vi.hoisted(() => vi.fn());

vi.mock("@/adapters/server/auth/resolver", () => ({
  getSessionResolver: () => ({ completeAuthorization }),
}));
vi.mock("@/adapters/server/auth/session", () => ({ storeSession, takeTransaction }));

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

  it("一時状態の復帰先が外部 URL でも自分の中へ戻す", async () => {
    takeTransaction.mockResolvedValue({ ...transaction, returnUrl: "https://evil.example.test" });

    const response = await GET(callback("?code=authorization-code&state=state-value"));

    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });
});
