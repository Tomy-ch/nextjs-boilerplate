import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";
import { serveJson } from "../../../../vitest.setup.msw";

const { getEnvironment } = vi.hoisted(() => ({ getEnvironment: vi.fn(() => PARSED_ENVIRONMENT) }));

vi.mock("@/config/environment", () => ({ getEnvironment }));

import { getPublicClient } from "./public-client";

const PING_URL = `${PARSED_ENVIRONMENT.APP_API_BASE_URL}/v1/ping`;

const schema = z.object({ ok: z.boolean() });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getPublicClient", () => {
  // ----- 正常系 -----
  it("呼び出しをまたいで同じ client を返す", () => {
    expect(getPublicClient()).toBe(getPublicClient());
  });

  it("設定の接続先へ送る", async () => {
    const requests = serveJson(PING_URL, { ok: true });

    await getPublicClient().request({ path: "/v1/ping", schema });

    expect(requests[0]?.url).toBe(PING_URL);
  });

  it("資格情報を付けずに送る", async () => {
    const requests = serveJson(PING_URL, { ok: true });

    await getPublicClient().request({ path: "/v1/ping", schema });

    expect(requests[0]?.headers.get("authorization")).toBeNull();
  });
});
