import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { signOut, clearCartSession } = vi.hoisted(() => ({
  signOut: vi.fn(),
  clearCartSession: vi.fn(),
}));

vi.mock("@/adapters/server/auth/session", () => ({ signOut }));
vi.mock("@/adapters/server/api/cart-session", () => ({ clearCartSession }));

function logout(): Request {
  return new Request("http://localhost:3000/api/auth/logout", { method: "POST" });
}

beforeEach(() => {
  vi.clearAllMocks();
  signOut.mockResolvedValue(undefined);
  clearCartSession.mockResolvedValue(undefined);
});

describe("POST", () => {
  // ----- 正常系 -----
  it("session を破棄する", async () => {
    await POST(logout());

    expect(signOut).toHaveBeenCalled();
  });

  it("ゲストのカートの識別子も破棄する", async () => {
    await POST(logout());

    expect(clearCartSession).toHaveBeenCalledOnce();
  });

  it("トップへ戻す", async () => {
    const response = await POST(logout());

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  // ----- 異常系 -----
  it("IdP 側の終了に失敗しても同じ画面へ戻す", async () => {
    signOut.mockRejectedValue(new Error("IdP が応答しません"));

    const response = await POST(logout());

    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });
});
