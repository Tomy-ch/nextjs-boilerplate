import { describe, expect, it, vi } from "vitest";
import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";
import { toUserId } from "@/model/user/user";
import "../../../../vitest.setup.msw";

const { getAccessToken, getEnvironment } = vi.hoisted(() => ({
  getAccessToken: vi.fn(async (): Promise<string | null> => "test-access-token"),
  getEnvironment: vi.fn(() => PARSED_ENVIRONMENT),
}));

vi.mock("@/config/environment", () => ({ getEnvironment }));
vi.mock("../auth/session", () => ({ getAccessToken }));
vi.mock("../taint/taint", () => ({ taintObjectReference: vi.fn() }));

import { getManagedUser } from "./users";

const MANAGED_USER_KEYS = ["deletedAt", "email", "firstName", "id", "lastName", "phone"];

describe("getManagedUser", () => {
  // ----- 正常系 -----
  it("生成ハンドラの応答から、画面が使う項目だけを組み立てる", async () => {
    const user = await getManagedUser(toUserId("0195f0c2-0000-7000-8000-0000000000a1"));

    expect(Object.keys(user).sort()).toEqual(MANAGED_USER_KEYS);
  });
});
