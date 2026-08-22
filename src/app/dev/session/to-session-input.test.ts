import { beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_ROLE } from "@/model/session";

const issueDevelopmentAccessToken = vi.hoisted(() => vi.fn());

vi.mock("@/adapters/server/auth/development-token", () => ({ issueDevelopmentAccessToken }));

import { toSessionInput } from "./to-session-input";

beforeEach(() => {
  vi.clearAllMocks();
  issueDevelopmentAccessToken.mockResolvedValue("issued-token");
});

describe("toSessionInput", () => {
  // ----- 正常系 -----
  it("取りに行く指定なら、その主体のトークンを取って載せる", async () => {
    const spec = await toSessionInput({
      subject: "user-john-doe",
      role: SESSION_ROLE.user,
      expiresInSeconds: 3600,
      issueAccessToken: true,
      issuer: "https://idp.example.test",
    });

    expect(issueDevelopmentAccessToken).toHaveBeenCalledWith({
      subject: "user-john-doe",
      issuer: "https://idp.example.test",
    });
    expect(spec).toMatchObject({ accessToken: "issued-token" });
  });

  it("取りに行かない指定なら、口を叩かない", async () => {
    await toSessionInput({
      subject: "dev-user",
      role: SESSION_ROLE.user,
      expiresInSeconds: 3600,
      issueAccessToken: false,
    });

    expect(issueDevelopmentAccessToken).not.toHaveBeenCalled();
  });

  it("経路の指定と接続先を、発行の指定として持ち回らない", async () => {
    const spec = await toSessionInput({
      subject: "dev-user",
      role: SESSION_ROLE.user,
      expiresInSeconds: 3600,
      issueAccessToken: true,
      issuer: "https://idp.example.test",
    });

    expect(spec).not.toHaveProperty("issueAccessToken");
    expect(spec).not.toHaveProperty("issuer");
  });

  // ----- 異常系 -----
  it("トークンを取れなければ、指定を組み立てない", async () => {
    issueDevelopmentAccessToken.mockRejectedValue(new Error("IdP へ到達できません"));

    await expect(
      toSessionInput({
        subject: "dev-user",
        role: SESSION_ROLE.user,
        expiresInSeconds: 3600,
        issueAccessToken: true,
        issuer: "https://idp.example.test",
      }),
    ).rejects.toThrow();
  });
});
