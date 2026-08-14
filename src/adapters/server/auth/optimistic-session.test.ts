import { describe, expect, it, vi } from "vitest";
import { SESSION_ROLE } from "@/model/session";
import { readOptimisticSession } from "./optimistic-session";

const restore = vi.hoisted(() => vi.fn());

vi.mock("./resolver", () => ({ getSessionResolver: () => ({ restore }) }));

const session = {
  userId: "user-1",
  role: SESSION_ROLE.user,
  expiresAt: new Date("2026-08-14T01:00:00.000Z"),
};

describe("readOptimisticSession", () => {
  // ----- 正常系 -----
  it("復元できた身元を返す", async () => {
    restore.mockResolvedValueOnce({ session, accessToken: "token", idToken: "id" });

    expect(await readOptimisticSession("sealed")).toEqual(session);
  });

  it("トークンを返さない", async () => {
    restore.mockResolvedValueOnce({ session, accessToken: "token", idToken: "id" });

    expect(await readOptimisticSession("sealed")).not.toHaveProperty("accessToken");
  });

  it("cookie が無ければ復元を試みない", async () => {
    restore.mockClear();

    expect(await readOptimisticSession(undefined)).toBeNull();
    expect(restore).not.toHaveBeenCalled();
  });

  // ----- 異常系 -----
  it("復元できなければ null にする", async () => {
    restore.mockResolvedValueOnce(null);

    expect(await readOptimisticSession("broken")).toBeNull();
  });
});
