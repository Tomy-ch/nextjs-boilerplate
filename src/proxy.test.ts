import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PROTECTED_PREFIXES } from "@/model/authz";
import { SESSION_ROLE } from "@/model/session";
import { proxy } from "./proxy";

const readOptimisticSession = vi.hoisted(() => vi.fn());

vi.mock("@/adapters/server/auth/optimistic-session", () => ({ readOptimisticSession }));

const session = {
  userId: "user-1",
  role: SESSION_ROLE.user,
  expiresAt: new Date("2026-08-14T01:00:00.000Z"),
};

function request(path: string, sealed?: string): NextRequest {
  const headers = sealed === undefined ? undefined : { cookie: `auth_session=${sealed}` };

  return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  readOptimisticSession.mockResolvedValue(null);
});

describe("proxy", () => {
  // ----- 正常系 -----
  it("保護されていないパスは素通しする", async () => {
    const response = await proxy(request("/help"));

    expect(response.headers.get("location")).toBeNull();
    expect(readOptimisticSession).not.toHaveBeenCalled();
  });

  it("session があれば保護されたパスも通す", async () => {
    readOptimisticSession.mockResolvedValue(session);

    const response = await proxy(request("/account", "sealed"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("役割が足りていれば管理の経路も通す", async () => {
    readOptimisticSession.mockResolvedValue({ ...session, role: SESSION_ROLE.admin });

    const response = await proxy(request("/admin/reports", "sealed"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("cookie の値を判定へ渡す", async () => {
    readOptimisticSession.mockResolvedValue(session);

    await proxy(request("/account", "sealed-value"));

    expect(readOptimisticSession).toHaveBeenCalledWith("sealed-value");
  });

  it("session cookie を載せた要求の応答は共有キャッシュへ載せない", async () => {
    readOptimisticSession.mockResolvedValue(session);

    const response = await proxy(request("/account", "sealed"));

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("保護されていないパスでも session cookie があれば共有キャッシュへ載せない", async () => {
    const response = await proxy(request("/api/purchases", "sealed"));

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("session cookie を持たない要求の応答には Cache-Control を付けない", async () => {
    const response = await proxy(request("/help"));

    expect(response.headers.get("cache-control")).toBeNull();
  });

  // ----- 異常系 -----
  it("未認証で保護されたパスへ来たらログインへ送る", async () => {
    const response = await proxy(request("/account"));

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?returnUrl=%2Faccount",
    );
  });

  it("認証の内側にある画面はいずれも前捌きの対象にする", async () => {
    const responses = await Promise.all(PROTECTED_PREFIXES.map((path) => proxy(request(path))));

    for (const response of responses) {
      expect(response.headers.get("location")).toContain("/login?returnUrl=");
    }
  });

  it("復帰先にクエリを含める", async () => {
    const response = await proxy(request("/account?tab=security"));

    expect(new URL(String(response.headers.get("location"))).searchParams.get("returnUrl")).toBe(
      "/account?tab=security",
    );
  });

  it("接頭辞の下のパスも保護の対象にする", async () => {
    const response = await proxy(request("/account/sessions"));

    expect(response.headers.get("location")).toContain("/login");
  });

  it("役割が足りない主体はログインへ戻さない", async () => {
    readOptimisticSession.mockResolvedValue(session);

    const response = await proxy(request("/admin/reports", "sealed"));

    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("役割が足りない主体には復帰先を持たせない", async () => {
    readOptimisticSession.mockResolvedValue(session);

    const response = await proxy(request("/admin/reports?page=2", "sealed"));

    expect(response.headers.get("location")).not.toContain("returnUrl");
  });

  it("未認証で管理の経路へ来たらログインへ送る", async () => {
    const response = await proxy(request("/admin/reports"));

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?returnUrl=%2Fadmin%2Freports",
    );
  });

  it("復元できない cookie で送り返す応答も共有キャッシュへ載せない", async () => {
    const response = await proxy(request("/account", "broken"));

    expect(response.headers.get("location")).toContain("/login");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
