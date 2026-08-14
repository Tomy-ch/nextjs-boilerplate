import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const signOut = vi.hoisted(() => vi.fn());

vi.mock("@/adapters/server/auth/session", () => ({ signOut }));

function logout(): Request {
  return new Request("http://localhost:3000/api/auth/logout", { method: "POST" });
}

beforeEach(() => {
  vi.clearAllMocks();
  signOut.mockResolvedValue(undefined);
});

describe("POST", () => {
  // ----- 正常系 -----
  it("session を破棄する", async () => {
    await POST(logout());

    expect(signOut).toHaveBeenCalled();
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
