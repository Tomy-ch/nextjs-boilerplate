import type { Mock } from "vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Environment } from "@/config/environment";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { SESSION_ROLE } from "@/model/session";

const environment: Environment = {
  APP_API_BASE_URL: "https://api.example.test",
  APP_API_MODE: "mock",
  MEDIA_ORIGIN: "https://media.example.test",
  OTEL_EXPORTER_OTLP_ENDPOINT: "https://otel.example.test/v1/traces",
  OBS_TRACES_EXPORTER: "none",
  OBS_METRICS_EXPORTER: "none",
  OBS_LOGS_EXPORTER: "none",
  AUTH_ISSUER: "https://id.example.test",
  AUTH_CLIENT_ID: "nextjs-boilerplate",
  AUTH_REDIRECT_URI: "https://app.example.test/auth/callback",
  AUTH_SCOPES: "openid profile",
  AUTH_SESSION_SECRET: "01234567890123456789012345678901",
  NEXT_PUBLIC_HTTP_MAX_URL_BYTES: 8000,
  NEXT_PUBLIC_HTTP_MAX_UPLOAD_BYTES: 4194304,
};

const { getEnvironment } = vi.hoisted(() => ({ getEnvironment: vi.fn(() => environment) }));

vi.mock("@/config/environment", () => ({ getEnvironment }));

import { fetchSessionRole } from "./user-roles";

function stubFetch(body: unknown): Mock<typeof fetch> {
  const fetchImpl = vi.fn<typeof fetch>(
    async () => new Response(JSON.stringify(body), { status: 200 }),
  );

  vi.stubGlobal("fetch", fetchImpl);

  return fetchImpl;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchSessionRole", () => {
  // ----- 正常系 -----
  it("管理者のロールを持つ主体を管理者として扱う", async () => {
    stubFetch({
      roles: [
        { code: "general", name: "一般" },
        { code: "admin", name: "管理者" },
      ],
    });

    expect(await fetchSessionRole("access-token")).toBe(SESSION_ROLE.admin);
  });

  it("一般のロールだけを持つ主体は一般として扱う", async () => {
    stubFetch({ roles: [{ code: "general", name: "一般" }] });

    expect(await fetchSessionRole("access-token")).toBe(SESSION_ROLE.user);
  });

  it("ロールを 1 つも持たない主体は権限を持たない側へ倒す", async () => {
    stubFetch({ roles: [] });

    expect(await fetchSessionRole("access-token")).toBe(SESSION_ROLE.user);
  });

  it("渡されたトークンを Bearer として載せる", async () => {
    const fetchImpl = stubFetch({ roles: [] });

    await fetchSessionRole("access-token");

    const init = fetchImpl.mock.calls[0]?.[1];

    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer access-token");
  });

  // ----- 異常系 -----
  it("契約に無い形の応答を内層へ渡さない", async () => {
    stubFetch({ roles: [{ code: "owner", name: "所有者" }] });

    await expect(fetchSessionRole("access-token")).rejects.toSatisfy(
      (error: unknown) => findAppError(error)?.kind === ErrorKind.INTERNAL,
    );
  });
});
