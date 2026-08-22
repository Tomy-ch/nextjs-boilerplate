import { beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_ROLE } from "@/model/session";

const { isDevelopmentAccessAllowed, issueDevelopmentAuthorizationCode, toSessionInput } =
  vi.hoisted(() => ({
    isDevelopmentAccessAllowed: vi.fn(),
    issueDevelopmentAuthorizationCode: vi.fn(),
    toSessionInput: vi.fn(),
  }));

vi.mock("@/adapters/server/auth/development-access", () => ({ isDevelopmentAccessAllowed }));
vi.mock("@/adapters/server/auth/development-authorization-code", () => ({
  issueDevelopmentAuthorizationCode,
}));
vi.mock("../to-session-input", () => ({ toSessionInput }));

import { POST } from "./route.dev";

/** 認可 endpoint への素の form 送信。個々の試験は、ここから 1 項目だけを変える。 */
function submission(overrides: Record<string, string> = {}): Request {
  const body = new FormData();

  for (const [name, value] of Object.entries({
    subject: "dev-user",
    role: SESSION_ROLE.user,
    expiresInSeconds: "3600",
    accessToken: "",
    issuerUrl: "https://idp.example.test",
    returnUrl: "/mypage",
    state: "tx-state",
    ...overrides,
  })) {
    if (value !== "") {
      body.set(name, value);
    }
  }

  return new Request("http://localhost:3000/dev/session/authorize", { method: "POST", body });
}

/** 転送先を、生成元を落とした形で読む。 */
function destinationOf(response: Response): string {
  const location = new URL(response.headers.get("location") ?? "");

  return `${location.pathname}${location.search}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  isDevelopmentAccessAllowed.mockResolvedValue(true);
  toSessionInput.mockImplementation(async (input: unknown) => input);
  issueDevelopmentAuthorizationCode.mockResolvedValue("sealed-code");
});

describe("POST", () => {
  // ----- 正常系 -----
  it("認可コードを持って callback へ返す", async () => {
    const response = await POST(submission());

    expect(response.status).toBe(303);
    expect(destinationOf(response)).toBe("/api/auth/callback?code=sealed-code&state=tx-state");
  });

  it("認可コードには、その場で指定した内容を渡す", async () => {
    await POST(submission({ role: SESSION_ROLE.admin, subject: "user-jane-smith" }));

    expect(issueDevelopmentAuthorizationCode).toHaveBeenCalledWith(
      expect.objectContaining({ role: SESSION_ROLE.admin, subject: "user-jane-smith" }),
    );
  });

  it("session をここでは置かない", async () => {
    const response = await POST(submission());

    expect(response.headers.get("set-cookie")).toBeNull();
  });

  // ----- 異常系 -----
  it("開けない環境では、面ごと見つからないことにする", async () => {
    isDevelopmentAccessAllowed.mockResolvedValue(false);

    const response = await POST(submission());

    expect(response.status).toBe(404);
    expect(issueDevelopmentAuthorizationCode).not.toHaveBeenCalled();
  });

  it("対応づける値が無い送信は受け付けない", async () => {
    const response = await POST(submission({ state: "" }));

    expect(response.status).toBe(400);
    expect(issueDevelopmentAuthorizationCode).not.toHaveBeenCalled();
  });

  it("指定が妥当でなければ、分類だけを載せて画面へ戻す", async () => {
    const response = await POST(submission({ subject: "" }));

    expect(destinationOf(response)).toBe(
      "/dev/session?returnUrl=%2Fmypage&state=tx-state&error=invalid",
    );
    expect(issueDevelopmentAuthorizationCode).not.toHaveBeenCalled();
  });

  it("トークンを取りに行けなければ、その分類を載せて画面へ戻す", async () => {
    toSessionInput.mockRejectedValue(new Error("IdP へ到達できません"));

    const response = await POST(submission({ issueAccessToken: "on" }));

    expect(destinationOf(response)).toBe(
      "/dev/session?returnUrl=%2Fmypage&state=tx-state&error=unavailable",
    );
    expect(issueDevelopmentAuthorizationCode).not.toHaveBeenCalled();
  });

  it("外部のサイトを戻り先に指定されても、自分の中へ倒して戻す", async () => {
    const response = await POST(submission({ returnUrl: "https://evil.example.com", subject: "" }));

    expect(destinationOf(response)).toBe("/dev/session?returnUrl=%2F&state=tx-state&error=invalid");
  });
});
