import { beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_ROLE } from "@/model/session";

const { issueDevelopmentAuthorizationCode, toSessionInput } = vi.hoisted(() => ({
  issueDevelopmentAuthorizationCode: vi.fn(),
  toSessionInput: vi.fn(),
}));

vi.mock("@/adapters/server/auth/development-authorization-code", () => ({
  issueDevelopmentAuthorizationCode,
}));
vi.mock("./to-session-input", () => ({ toSessionInput }));

import { authorizeDevelopmentSession } from "./authorize-development-session";

/** 認可 endpoint への素の form 送信。個々の試験は、ここから 1 項目だけを変える。 */
function submission(overrides: Record<string, string> = {}): Request {
  const body = new FormData();

  for (const [name, value] of Object.entries({
    subject: "dev-user",
    role: SESSION_ROLE.user,
    expiresInSeconds: "3600",
    accessToken: "",
    issuerUrl: "https://idp.example.test",
    returnUrl: "/account",
    state: "tx-state",
    ...overrides,
  })) {
    if (value !== "") {
      body.set(name, value);
    }
  }

  return new Request("http://localhost:3000/dev/session/authorize", { method: "POST", body });
}

/** 本体の大きさを名乗る送信。中身は妥当なので、上限で落ちなければそのまま処理へ進む。 */
function declaring(declaredBytes: number): Request {
  return new Request("http://localhost:3000/dev/session/authorize", {
    method: "POST",
    headers: {
      "content-length": String(declaredBytes),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "subject=dev-user&role=user&expiresInSeconds=3600&state=tx-state&returnUrl=%2Faccount",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  toSessionInput.mockImplementation(async (input: unknown) => input);
  issueDevelopmentAuthorizationCode.mockResolvedValue("sealed-code");
});

describe("authorizeDevelopmentSession", () => {
  // ----- 正常系 -----
  it("認可コードを持って callback へ返す", async () => {
    expect(await authorizeDevelopmentSession(submission())).toEqual({
      kind: "redirect",
      destination: "/api/auth/callback?code=sealed-code&state=tx-state",
    });
  });

  it("本体が上限ちょうどなら、読み切って処理を続ける", async () => {
    expect(await authorizeDevelopmentSession(declaring(64 * 1024))).toMatchObject({
      kind: "redirect",
    });
  });

  it("認可コードを、その場で指定した内容と発行元の要求で組む", async () => {
    await authorizeDevelopmentSession(
      submission({ role: SESSION_ROLE.admin, subject: "user-jane-smith" }),
    );

    expect(issueDevelopmentAuthorizationCode).toHaveBeenCalledWith({
      state: "tx-state",
      spec: expect.objectContaining({ role: SESSION_ROLE.admin, subject: "user-jane-smith" }),
    });
  });

  // ----- 異常系 -----
  it("対応づける値が無い送信は、認可の往復の外から来たものとして扱う", async () => {
    expect(await authorizeDevelopmentSession(submission({ state: "" }))).toEqual({
      kind: "not-an-authorization",
    });
    expect(issueDevelopmentAuthorizationCode).not.toHaveBeenCalled();
  });

  it("本体が大きすぎる送信は、読み切る前に断る", async () => {
    expect(await authorizeDevelopmentSession(declaring(64 * 1024 + 1))).toEqual({
      kind: "too-large",
    });
    expect(issueDevelopmentAuthorizationCode).not.toHaveBeenCalled();
  });

  it("指定が妥当でなければ、分類だけを載せて画面へ戻す", async () => {
    expect(await authorizeDevelopmentSession(submission({ subject: "" }))).toEqual({
      kind: "redirect",
      destination: "/dev/session?returnUrl=%2Faccount&state=tx-state&error=invalid",
    });
    expect(issueDevelopmentAuthorizationCode).not.toHaveBeenCalled();
  });

  it("誰として入るかが長すぎる指定を、妥当でないものとして戻す", async () => {
    expect(
      await authorizeDevelopmentSession(submission({ subject: "a".repeat(257) })),
    ).toMatchObject({ destination: expect.stringContaining("error=invalid") });
  });

  it("トークンを取りに行けなければ、その分類を載せて画面へ戻す", async () => {
    toSessionInput.mockRejectedValue(new Error("IdP へ到達できません"));

    expect(await authorizeDevelopmentSession(submission({ issueAccessToken: "on" }))).toEqual({
      kind: "redirect",
      destination: "/dev/session?returnUrl=%2Faccount&state=tx-state&error=unavailable",
    });
  });

  it("外部のサイトを戻り先に指定されても、自分の中へ倒して戻す", async () => {
    expect(
      await authorizeDevelopmentSession(
        submission({ returnUrl: "https://evil.example.com", subject: "" }),
      ),
    ).toEqual({
      kind: "redirect",
      destination: "/dev/session?returnUrl=%2F&state=tx-state&error=invalid",
    });
  });
});
