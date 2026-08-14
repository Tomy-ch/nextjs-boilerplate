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
  returnUrl: "/products",
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

  // ----- 異常系 -----
  it("復帰先が無ければルートへ戻す前提で組む", async () => {
    await GET(new Request("http://localhost:3000/api/auth/login"));

    expect(startAuthorization).toHaveBeenCalledWith("/");
  });

  it("外部 URL の復帰先を落とす", async () => {
    await GET(
      new Request("http://localhost:3000/api/auth/login?returnUrl=https%3A%2F%2Fevil.example.test"),
    );

    expect(startAuthorization).toHaveBeenCalledWith("/");
  });
});
