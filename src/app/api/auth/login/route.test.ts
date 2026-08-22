import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const startAuthorization = vi.hoisted(() => vi.fn());
const storeTransaction = vi.hoisted(() => vi.fn());

vi.mock("@/adapters/server/auth/resolver", () => ({
  getSessionResolver: () => ({ startAuthorization }),
}));
vi.mock("@/adapters/server/auth/session", () => ({ storeTransaction }));

const transaction = {
  state: "state-value",
  codeVerifier: "verifier-value",
  nonce: "nonce-value",
  returnUrl: "/settings",
};

beforeEach(() => {
  vi.clearAllMocks();
  startAuthorization.mockResolvedValue({
    authorizationUrl: "https://idp.example.test/oidc/authorize?client_id=x",
    transaction,
  });
});

describe("GET", () => {
  // ----- 正常系 -----
  it("IdP の認可画面へ送る", async () => {
    const response = await GET(new Request("http://localhost:3000/api/auth/login"));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://idp.example.test/oidc/authorize?client_id=x",
    );
  });

  it("復帰先を認可要求へ渡す", async () => {
    await GET(new Request("http://localhost:3000/api/auth/login?returnUrl=%2Fmypage"));

    expect(startAuthorization).toHaveBeenCalledWith("/mypage");
  });

  it("一時状態を保存してから送り出す", async () => {
    await GET(new Request("http://localhost:3000/api/auth/login"));

    expect(storeTransaction).toHaveBeenCalledWith(transaction);
  });

  it("復帰先が無ければルートへ戻す前提で組む", async () => {
    await GET(new Request("http://localhost:3000/api/auth/login"));

    expect(startAuthorization).toHaveBeenCalledWith("/");
  });

  // ----- 異常系 -----
  it("外部 URL の復帰先を落とす", async () => {
    await GET(
      new Request("http://localhost:3000/api/auth/login?returnUrl=https%3A%2F%2Fevil.example.test"),
    );

    expect(startAuthorization).toHaveBeenCalledWith("/");
  });

  it("IdP へ到達できなければログインへ戻して再試行させる", async () => {
    startAuthorization.mockRejectedValue(new Error("IdP へ到達できません"));

    const response = await GET(
      new Request("http://localhost:3000/api/auth/login?returnUrl=%2Fmypage"),
    );
    const location = new URL(String(response.headers.get("location")));

    expect(response.status).toBe(302);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("returnUrl")).toBe("/mypage");
    expect(storeTransaction).not.toHaveBeenCalled();
  });

  it("一時状態を保存できなくても、認可画面へは送らない", async () => {
    storeTransaction.mockRejectedValue(new Error("cookie を置けません"));

    const response = await GET(new Request("http://localhost:3000/api/auth/login"));
    const location = new URL(String(response.headers.get("location")));

    expect(response.status).toBe(302);
    expect(location.pathname).toBe("/login");
  });

  it("戻すときに、始められなかった理由を載せる", async () => {
    startAuthorization.mockRejectedValue(new Error("IdP へ到達できません"));

    const response = await GET(new Request("http://localhost:3000/api/auth/login"));
    const location = new URL(String(response.headers.get("location")));

    expect(response.status).toBe(302);
    expect(location.searchParams.get("error")).toBe("unavailable");
  });
});
