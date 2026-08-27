import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));
const { clearCartSession } = vi.hoisted(() => ({ clearCartSession: vi.fn() })); // sample:line

vi.mock("@/adapters/server/auth/session", () => ({ signOut }));
vi.mock("@/adapters/server/api/cart-session", () => ({ clearCartSession })); // sample:line

function logout(): Request {
  return new Request("http://localhost:3000/api/auth/logout", { method: "POST" });
}

const IDP_LOGOUT = "https://idp.example.test/oidc/logout?id_token_hint=token";

beforeEach(() => {
  vi.clearAllMocks();
  signOut.mockResolvedValue(null);
  clearCartSession.mockResolvedValue(undefined); // sample:line
});

describe("POST", () => {
  // ----- 正常系 -----
  it("session を破棄する", async () => {
    await POST(logout());

    expect(signOut).toHaveBeenCalled();
  });

  // sample:begin
  it("ゲストのカートの識別子も破棄する", async () => {
    await POST(logout());

    expect(clearCartSession).toHaveBeenCalledOnce();
  });
  // sample:end

  it("IdP のログアウトへ送り出す", async () => {
    signOut.mockResolvedValue(IDP_LOGOUT);

    const response = await POST(logout());

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(IDP_LOGOUT);
  });

  it("終わらせる口を持たない IdP ならトップへ戻す", async () => {
    const response = await POST(logout());

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  // ----- 異常系 -----
  it("送り先を組み立てられなくてもトップへ戻す", async () => {
    signOut.mockRejectedValue(new Error("IdP が応答しません"));

    const response = await POST(logout());

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });
});
