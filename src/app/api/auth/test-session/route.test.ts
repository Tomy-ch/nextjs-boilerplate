import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_ROLE } from "@/model/session";
import { POST } from "./route";

const storeSession = vi.hoisted(() => vi.fn());
const environment = vi.hoisted((): { value: string | null } => ({ value: "local" }));

vi.mock("@/adapters/server/auth/session", () => ({ storeSession }));
vi.mock("@/config/load-environment", () => ({
  findExplicitApplicationEnvironment: () => environment.value,
}));

function issue(body?: unknown): Request {
  return new Request("http://localhost:3000/api/auth/test-session", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  environment.value = "local";
});

describe("POST", () => {
  // ----- 正常系 -----
  it("開発環境では session を発行する", async () => {
    const response = await POST(issue({}));

    expect(response.status).toBe(204);
    expect(storeSession).toHaveBeenCalled();
  });

  it("CI でも発行する", async () => {
    environment.value = "ci";

    expect((await POST(issue({}))).status).toBe(204);
  });

  it("指定した subject と役割で発行する", async () => {
    await POST(issue({ subject: "user-jane-smith", role: SESSION_ROLE.admin }));

    expect(storeSession.mock.calls[0]?.[0].session).toMatchObject({
      userId: "user-jane-smith",
      role: SESSION_ROLE.admin,
    });
  });

  it("指定が無ければ権限を持たない側で発行する", async () => {
    await POST(issue({}));

    expect(storeSession.mock.calls[0]?.[0].session.role).toBe(SESSION_ROLE.user);
  });

  it("失効までの秒数を指定できる", async () => {
    const before = Date.now();

    await POST(issue({ expiresInSeconds: 120 }));

    const expiresAt: Date = storeSession.mock.calls[0]?.[0].session.expiresAt;

    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 120 * 1000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 120 * 1000);
  });

  it("本文が無くても既定で発行する", async () => {
    expect((await POST(issue())).status).toBe(204);
  });

  // ----- 異常系 -----
  it("本番では口の存在を知らせない", async () => {
    environment.value = "prd";

    const response = await POST(issue({}));

    expect(response.status).toBe(404);
    expect(storeSession).not.toHaveBeenCalled();
  });

  it("staging でも開けない", async () => {
    environment.value = "stg";

    expect((await POST(issue({}))).status).toBe(404);
  });

  it("開発向けの共有環境でも開けない", async () => {
    environment.value = "dev";

    expect((await POST(issue({}))).status).toBe(404);
  });

  it("APP_ENV が明示されていなければ開けない", async () => {
    environment.value = null;

    const response = await POST(issue({}));

    expect(response.status).toBe(404);
    expect(storeSession).not.toHaveBeenCalled();
  });

  it("指定が壊れていれば発行しない", async () => {
    const response = await POST(issue({ role: "superuser" }));

    expect(response.status).toBe(400);
    expect(storeSession).not.toHaveBeenCalled();
  });
});
