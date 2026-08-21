import { describe, expect, it, vi } from "vitest";

import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { SESSION_ROLE } from "@/model/session";
import { serveJson } from "../../../../vitest.setup";

const { getEnvironment } = vi.hoisted(() => ({ getEnvironment: vi.fn(() => PARSED_ENVIRONMENT) }));

vi.mock("@/config/environment", () => ({ getEnvironment }));

import { fetchSessionRole } from "./user-roles";

const ROLES_URL = `${PARSED_ENVIRONMENT.APP_API_BASE_URL}/v1/users/me/roles`;

describe("fetchSessionRole", () => {
  // ----- 正常系 -----
  it("管理者のロールを持つ主体を管理者として扱う", async () => {
    serveJson(ROLES_URL, {
      roles: [
        { code: "general", name: "一般" },
        { code: "admin", name: "管理者" },
      ],
    });

    expect(await fetchSessionRole("access-token")).toBe(SESSION_ROLE.admin);
  });

  it("一般のロールだけを持つ主体は一般として扱う", async () => {
    serveJson(ROLES_URL, { roles: [{ code: "general", name: "一般" }] });

    expect(await fetchSessionRole("access-token")).toBe(SESSION_ROLE.user);
  });

  it("ロールを 1 つも持たない主体は権限を持たない側へ倒す", async () => {
    serveJson(ROLES_URL, { roles: [] });

    expect(await fetchSessionRole("access-token")).toBe(SESSION_ROLE.user);
  });

  it("渡されたトークンを Bearer として載せる", async () => {
    const requests = serveJson(ROLES_URL, { roles: [] });

    await fetchSessionRole("access-token");

    expect(requests[0]?.headers.get("authorization")).toBe("Bearer access-token");
  });

  // ----- 異常系 -----
  it("契約に無い形の応答を内層へ渡さない", async () => {
    serveJson(ROLES_URL, { roles: [{ code: "owner", name: "所有者" }] });

    await expect(fetchSessionRole("access-token")).rejects.toSatisfy(
      (error: unknown) => findAppError(error)?.kind === ErrorKind.INTERNAL,
    );
  });
});
