import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_ROLE } from "@/model/session";
import { POST } from "./route.dev";

const issueTestSession = vi.hoisted(() => vi.fn());
const isDevelopmentAccessAllowed = vi.hoisted(() => vi.fn());

vi.mock("@/adapters/server/auth/test-session", () => ({ issueTestSession }));
vi.mock("@/adapters/server/auth/development-access", () => ({ isDevelopmentAccessAllowed }));

function issue(body?: unknown): Request {
  return new Request("http://localhost:3000/api/auth/test-session", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  isDevelopmentAccessAllowed.mockResolvedValue(true);
});

describe("POST", () => {
  // ----- 正常系 -----
  it("開けている宛先では session を発行する", async () => {
    const response = await POST(issue({}));

    expect(response.status).toBe(204);
    expect(issueTestSession).toHaveBeenCalled();
  });

  it("指定した subject と役割で発行する", async () => {
    await POST(issue({ subject: "user-jane-smith", role: SESSION_ROLE.admin }));

    expect(issueTestSession).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "user-jane-smith", role: SESSION_ROLE.admin }),
    );
  });

  it("指定が無ければ権限を持たない側で発行する", async () => {
    await POST(issue({}));

    expect(issueTestSession).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "user-john-doe", role: SESSION_ROLE.user }),
    );
  });

  it("失効までの秒数を指定できる", async () => {
    await POST(issue({ expiresInSeconds: 120 }));

    expect(issueTestSession).toHaveBeenCalledWith(
      expect.objectContaining({ expiresInSeconds: 120 }),
    );
  });

  it("本文が無くても既定で発行する", async () => {
    expect((await POST(issue())).status).toBe(204);
  });

  // ----- 異常系 -----
  it("開けない宛先では口の存在を知らせない", async () => {
    isDevelopmentAccessAllowed.mockResolvedValue(false);

    const response = await POST(issue({}));

    expect(response.status).toBe(404);
    expect(issueTestSession).not.toHaveBeenCalled();
  });

  it("指定が壊れていれば発行しない", async () => {
    const response = await POST(issue({ role: "superuser" }));

    expect(response.status).toBe(400);
    expect(issueTestSession).not.toHaveBeenCalled();
  });
});
