import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PROTECTED_PREFIXES } from "@/model/authz";
import {
  CONSENT_CHOICE,
  CONSENT_COOKIE_NAME,
  MEASUREMENT_ID_COOKIE_NAME,
  toConsentCookieValue,
} from "@/model/consent";
import { SESSION_ROLE } from "@/model/session";
import { proxy } from "./proxy";

const readOptimisticSession = vi.hoisted(() => vi.fn());
const maintenance = vi.hoisted(() => ({ isStopped: false }));
const allowedOrigins = vi.hoisted((): { current: readonly string[] } => ({ current: [] }));

vi.mock("@/adapters/server/auth/optimistic-session", () => ({ readOptimisticSession }));
vi.mock("@/config/maintenance/maintenance.server", () => ({
  getMaintenanceConfig: () => maintenance,
}));
vi.mock("@/config/http/http.server", () => ({
  getHttpConfig: () => ({ allowedOrigins: allowedOrigins.current }),
}));

const PARTNER_ORIGIN = "https://partner.example.test";

const session = {
  userId: "user-1",
  role: SESSION_ROLE.user,
  expiresAt: new Date("2026-08-14T01:00:00.000Z"),
};

function request(path: string, sealed?: string): NextRequest {
  const headers = sealed === undefined ? undefined : { cookie: `auth_session=${sealed}` };

  return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}

/** 別 origin から来た要求。 */
function crossOrigin(
  path: string,
  origin: string,
  init: { method?: string; headers?: Record<string, string> } = {},
): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    method: init.method ?? "GET",
    headers: { origin, host: "localhost:3000", ...init.headers },
  });
}

/** cookie を載せた要求。同意と計測 id の有無を組み替える。 */
function withCookies(cookies: Record<string, string>): NextRequest {
  const cookie = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

  return new NextRequest(new URL("/help", "http://localhost:3000"), { headers: { cookie } });
}

/** その名前の cookie を載せた `Set-Cookie` の 1 行ぶん。属性まで含む。 */
function setCookieFor(response: Response, name: string): string {
  return response.headers.getSetCookie().find((entry) => entry.startsWith(`${name}=`)) ?? "";
}

/** 応答が発行した計測 id。撤去のときは空文字が載る。 */
function issuedMeasurementId(response: Response): string | undefined {
  return response.headers
    .getSetCookie()
    .find((entry) => entry.startsWith(`${MEASUREMENT_ID_COOKIE_NAME}=`))
    ?.slice(MEASUREMENT_ID_COOKIE_NAME.length + 1)
    .split(";")[0];
}

/** 読み取りだが GET ではない要求。 */
function headRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"), { method: "HEAD" });
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
  allowedOrigins.current = [];
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

  it("session cookie を載せた要求の応答は共有キャッシュへ載せない", async () => {
    readOptimisticSession.mockResolvedValue(session);

    const response = await proxy(request("/account", "sealed"));

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("保護されていないパスでも session cookie があれば共有キャッシュへ載せない", async () => {
    const response = await proxy(request("/api/help", "sealed"));

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("session cookie を持たない要求の応答には Cache-Control を付けない", async () => {
    const response = await proxy(request("/help"));

    expect(response.headers.get("cache-control")).toBeNull();
  });

  it("宣言で許した origin からの BFF への要求に CORS ヘッダを付ける", async () => {
    allowedOrigins.current = [PARTNER_ORIGIN];

    const response = await proxy(crossOrigin("/api/help", PARTNER_ORIGIN));

    expect(response.headers.get("access-control-allow-origin")).toBe(PARTNER_ORIGIN);
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
    expect(response.headers.get("vary")).toBe("Origin");
  });

  it("宣言で許した origin からの preflight には 204 で求められたメソッドとヘッダを返す", async () => {
    allowedOrigins.current = [PARTNER_ORIGIN];

    const response = await proxy(
      crossOrigin("/api/help", PARTNER_ORIGIN, {
        method: "OPTIONS",
        headers: {
          "access-control-request-method": "POST",
          "access-control-request-headers": "content-type",
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-methods")).toBe("POST");
    expect(response.headers.get("access-control-allow-headers")).toBe("content-type");
    expect(response.headers.get("access-control-max-age")).toBe("600");
  });

  it("自分自身からの書き込みは通す", async () => {
    const response = await proxy(
      crossOrigin("/api/telemetry", "http://localhost:3000", { method: "POST" }),
    );

    expect(response.status).toBe(200);
  });

  it("リバースプロキシの後ろでは X-Forwarded-Host を自分の host として読む", async () => {
    const response = await proxy(
      crossOrigin("/api/telemetry", "https://app.example.test", {
        method: "POST",
        headers: { "x-forwarded-host": "app.example.test" },
      }),
    );

    expect(response.status).toBe(200);
  });

  it("Origin を持たない書き込みは通す", async () => {
    const response = await proxy(
      new NextRequest(new URL("/api/telemetry", "http://localhost:3000"), { method: "POST" }),
    );

    expect(response.status).toBe(200);
  });

  it("停止中はどのパスも停止画面へ差し替える", async () => {
    maintenance.isStopped = true;

    const response = await proxy(request("/help"));

    expect(response.headers.get("x-middleware-rewrite")).toBe("http://localhost:3000/maintenance");
  });

  it("停止中は URL を動かさない", async () => {
    maintenance.isStopped = true;

    const response = await proxy(request("/help"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("停止中は認可の前捌きへ進まない", async () => {
    maintenance.isStopped = true;

    await proxy(request("/account", "sealed"));

    expect(readOptimisticSession).not.toHaveBeenCalled();
  });

  it("停止中は状態を変える要求を差し替えずに断る", async () => {
    maintenance.isStopped = true;

    const response = await proxy(serverAction("/help"));

    expect(response.status).toBe(503);
  });

  it("停止中に断った要求は停止画面を描かせない", async () => {
    maintenance.isStopped = true;

    const response = await proxy(serverAction("/help"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("停止中でも読み取りであれば HEAD も停止画面へ差し替える", async () => {
    maintenance.isStopped = true;

    const response = await proxy(headRequest("/help"));

    expect(response.headers.get("x-middleware-rewrite")).toBe("http://localhost:3000/maintenance");
  });

  it("停止中も生存確認は通す", async () => {
    maintenance.isStopped = true;

    const response = await proxy(request("/api/health"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("location")).toBeNull();
  });

  it("停止中の生存確認は method を問わず通す", async () => {
    maintenance.isStopped = true;

    const response = await proxy(serverAction("/api/health"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.status).not.toBe(503);
  });

  it("停止中も停止画面自身は差し替えない", async () => {
    maintenance.isStopped = true;

    const response = await proxy(request("/maintenance"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("宣言に無い origin からの読み出しは止めないが CORS ヘッダを付けない", async () => {
    const response = await proxy(crossOrigin("/api/help", "https://evil.example.test"));

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("許した origin でも画面の経路には CORS ヘッダを付けない", async () => {
    allowedOrigins.current = [PARTNER_ORIGIN];

    const response = await proxy(crossOrigin("/help", PARTNER_ORIGIN));

    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("許した origin でも画面の経路への preflight は素通しにする", async () => {
    allowedOrigins.current = [PARTNER_ORIGIN];

    const response = await proxy(crossOrigin("/help", PARTNER_ORIGIN, { method: "OPTIONS" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-methods")).toBeNull();
  });

  it("同意が得られていれば計測 id を発行する", async () => {
    const response = await proxy(
      withCookies({ [CONSENT_COOKIE_NAME]: toConsentCookieValue(CONSENT_CHOICE.granted) }),
    );

    expect(issuedMeasurementId(response)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("すでに配ってある計測 id は作り直さない", async () => {
    const response = await proxy(
      withCookies({
        [CONSENT_COOKIE_NAME]: toConsentCookieValue(CONSENT_CHOICE.granted),
        [MEASUREMENT_ID_COOKIE_NAME]: "issued-earlier",
      }),
    );

    expect(issuedMeasurementId(response)).toBeUndefined();
  });

  it("計測 id を配る応答は、資格情報が無くても共有キャッシュへ載せない", async () => {
    const response = await proxy(
      withCookies({ [CONSENT_COOKIE_NAME]: toConsentCookieValue(CONSENT_CHOICE.granted) }),
    );

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("止めているあいだも、同意が得られていれば計測 id を配る", async () => {
    maintenance.isStopped = true;

    const response = await proxy(
      withCookies({ [CONSENT_COOKIE_NAME]: toConsentCookieValue(CONSENT_CHOICE.granted) }),
    );

    expect(issuedMeasurementId(response)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("https で配信されていれば、計測 id に secure を付ける", async () => {
    const secured = new NextRequest(new URL("/help", "https://app.example.test"), {
      headers: {
        cookie: `${CONSENT_COOKIE_NAME}=${toConsentCookieValue(CONSENT_CHOICE.granted)}`,
      },
    });

    const response = await proxy(secured);

    expect(setCookieFor(response, MEASUREMENT_ID_COOKIE_NAME)).toContain("Secure");
  });

  it("https でなければ secure を付けない。付けると手元で保存されない", async () => {
    const response = await proxy(
      withCookies({ [CONSENT_COOKIE_NAME]: toConsentCookieValue(CONSENT_CHOICE.granted) }),
    );

    expect(setCookieFor(response, MEASUREMENT_ID_COOKIE_NAME)).not.toContain("Secure");
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

  it("宣言に無い origin からの書き込みは 403 で止める", async () => {
    const response = await proxy(
      crossOrigin("/api/telemetry", "https://evil.example.test", { method: "POST" }),
    );

    expect(response.status).toBe(403);
    expect(readOptimisticSession).not.toHaveBeenCalled();
  });

  it("Origin が null の書き込みも 403 で止める", async () => {
    const response = await proxy(crossOrigin("/api/telemetry", "null", { method: "POST" }));

    expect(response.status).toBe(403);
  });

  it("同意が無い間は計測 id を発行しない", async () => {
    const response = await proxy(withCookies({}));

    expect(issuedMeasurementId(response)).toBeUndefined();
  });

  it("拒否されている間も計測 id を発行しない", async () => {
    const response = await proxy(
      withCookies({ [CONSENT_COOKIE_NAME]: toConsentCookieValue(CONSENT_CHOICE.denied) }),
    );

    expect(issuedMeasurementId(response)).toBeUndefined();
  });

  it("同意が外れていれば、配ってある計測 id を撤去する", async () => {
    const response = await proxy(withCookies({ [MEASUREMENT_ID_COOKIE_NAME]: "issued-earlier" }));

    expect(issuedMeasurementId(response)).toBe("");
  });

  it("計測 id を撤去する応答も共有キャッシュへ載せない", async () => {
    const response = await proxy(withCookies({ [MEASUREMENT_ID_COOKIE_NAME]: "issued-earlier" }));

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("cookie を書き換えない応答は共有キャッシュへ載せてよい", async () => {
    const response = await proxy(
      withCookies({ [CONSENT_COOKIE_NAME]: toConsentCookieValue(CONSENT_CHOICE.denied) }),
    );

    expect(response.headers.get("cache-control")).toBeNull();
  });

  it("止めているあいだも、同意が外れた計測 id を撤去する", async () => {
    maintenance.isStopped = true;

    const response = await proxy(withCookies({ [MEASUREMENT_ID_COOKIE_NAME]: "issued-earlier" }));

    expect(issuedMeasurementId(response)).toBe("");
  });
});
