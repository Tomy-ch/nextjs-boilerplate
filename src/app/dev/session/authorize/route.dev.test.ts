import { beforeEach, describe, expect, it, vi } from "vitest";

const { authorizeDevelopmentSession, isDevelopmentAccessAllowed } = vi.hoisted(() => ({
  authorizeDevelopmentSession: vi.fn(),
  isDevelopmentAccessAllowed: vi.fn(),
}));

vi.mock("@/adapters/server/auth/development-access", () => ({ isDevelopmentAccessAllowed }));
vi.mock("../authorize-development-session", () => ({ authorizeDevelopmentSession }));

import { POST } from "./route.dev";

function submission(): Request {
  return new Request("http://localhost:3000/dev/session/authorize", { method: "POST" });
}

beforeEach(() => {
  vi.clearAllMocks();
  isDevelopmentAccessAllowed.mockResolvedValue(true);
  authorizeDevelopmentSession.mockResolvedValue({
    kind: "redirect",
    destination: "/api/auth/callback?code=sealed-code&state=tx-state",
  });
});

describe("POST", () => {
  // ----- 正常系 -----
  it("転送先を受け取ったら、GET で開き直させる 303 で返す", async () => {
    const response = await POST(submission());

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/api/auth/callback?code=sealed-code&state=tx-state",
    );
  });

  it("session をここでは置かない", async () => {
    expect((await POST(submission())).headers.get("set-cookie")).toBeNull();
  });

  // ----- 異常系 -----
  it("開けない環境では、面ごと見つからないことにする", async () => {
    isDevelopmentAccessAllowed.mockResolvedValue(false);

    expect((await POST(submission())).status).toBe(404);
    expect(authorizeDevelopmentSession).not.toHaveBeenCalled();
  });

  it("認可の往復の外から来た送信を 400 で断る", async () => {
    authorizeDevelopmentSession.mockResolvedValue({ kind: "not-an-authorization" });

    expect((await POST(submission())).status).toBe(400);
  });

  it("本体が大きすぎる送信を 413 で断る", async () => {
    authorizeDevelopmentSession.mockResolvedValue({ kind: "too-large" });

    expect((await POST(submission())).status).toBe(413);
  });
});
