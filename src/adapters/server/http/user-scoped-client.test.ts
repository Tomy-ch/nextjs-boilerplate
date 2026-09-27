import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { serveJson } from "../../../../vitest.setup.msw";

const { getAccessToken, getEnvironment } = vi.hoisted(() => ({
  getAccessToken: vi.fn(async (): Promise<string | null> => null),
  getEnvironment: vi.fn(() => PARSED_ENVIRONMENT),
}));

vi.mock("@/config/environment", () => ({ getEnvironment }));
vi.mock("../auth/session", () => ({ getAccessToken }));

import { getUserScopedClient } from "./user-scoped-client";

const PING_URL = `${PARSED_ENVIRONMENT.APP_API_BASE_URL}/v1/ping`;

const schema = z.object({ ok: z.boolean() });

beforeEach(() => {
  getAccessToken.mockResolvedValue(null);
});

describe("getUserScopedClient", () => {
  // ----- 正常系 -----
  it("呼び出しをまたいで同じ client を返す", () => {
    expect(getUserScopedClient()).toBe(getUserScopedClient());
  });

  it("設定の接続先へ送る", async () => {
    getAccessToken.mockResolvedValue("access-token");
    const requests = serveJson(PING_URL, { ok: true });

    await getUserScopedClient().request({ path: "/v1/ping", schema });

    expect(requests[0]?.url).toBe(PING_URL);
  });

  it("session の資格情報を要求のたびに解決して Bearer として載せる", async () => {
    const requests = serveJson(PING_URL, { ok: true });

    getAccessToken.mockResolvedValue("first-token");
    await getUserScopedClient().request({ path: "/v1/ping", schema });
    getAccessToken.mockResolvedValue("second-token");
    await getUserScopedClient().request({ path: "/v1/ping", schema });

    expect(requests[0]?.headers.get("authorization")).toBe("Bearer first-token");
    expect(requests[1]?.headers.get("authorization")).toBe("Bearer second-token");
  });

  // ----- 異常系 -----
  it("資格情報が無く、任意とも宣言していない要求は送らずに未認証で落とす", async () => {
    const requests = serveJson(PING_URL, { ok: true });

    await expect(getUserScopedClient().request({ path: "/v1/ping", schema })).rejects.toSatisfy(
      (error: unknown) => findAppError(error)?.kind === ErrorKind.UNAUTHENTICATED,
    );
    expect(requests).toHaveLength(0);
  });
});
