import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PROTECTED_PREFIXES } from "@/model/authz";
import { SESSION_ROLE } from "@/model/session";
import { proxy } from "./proxy";

const readOptimisticSession = vi.hoisted(() => vi.fn());
const maintenance = vi.hoisted(() => ({ isStopped: false }));

vi.mock("@/adapters/server/auth/optimistic-session", () => ({ readOptimisticSession }));
vi.mock("@/config/maintenance/maintenance.server", () => ({
  getMaintenanceConfig: () => maintenance,
}));

const session = {
  userId: "user-1",
  role: SESSION_ROLE.user,
  expiresAt: new Date("2026-08-14T01:00:00.000Z"),
};

function request(path: string, sealed?: string): NextRequest {
  const headers = sealed === undefined ? undefined : { cookie: `auth_session=${sealed}` };

  return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}

/** Server Action の送信。使用先の route へ `Next-Action` 付きの POST として届く。 */
function serverAction(path: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    method: "POST",
    headers: { "next-action": "0123456789abcdef" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  readOptimisticSession.mockResolvedValue(null);
  maintenance.isStopped = false;
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

  it("停止中はどのパスも停止画面へ差し替える", async () => {
    maintenance.isStopped = true;

    const response = await proxy(request("/products/1"));

    expect(response.headers.get("x-middleware-rewrite")).toBe("http://localhost:3000/maintenance");
  });

  it("停止中は URL を動かさない", async () => {
    maintenance.isStopped = true;

    const response = await proxy(request("/products/1"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("停止中は認可の前捌きへ進まない", async () => {
    maintenance.isStopped = true;

    await proxy(request("/account", "sealed"));

    expect(readOptimisticSession).not.toHaveBeenCalled();
  });

  it("停止中は状態を変える要求を差し替えずに断る", async () => {
    maintenance.isStopped = true;

    const response = await proxy(serverAction("/checkout"));

    expect(response.status).toBe(503);
  });

  it("停止中に断った要求は停止画面を描かせない", async () => {
    maintenance.isStopped = true;

    const response = await proxy(serverAction("/checkout"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("停止中も生存確認は通す", async () => {
    maintenance.isStopped = true;

    const response = await proxy(request("/api/health"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("停止中も停止画面自身は差し替えない", async () => {
    maintenance.isStopped = true;

    const response = await proxy(request("/maintenance"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
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
});
