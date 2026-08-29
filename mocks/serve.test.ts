import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";

import { startMockApi } from "./serve";

let server: ReturnType<typeof startMockApi> | undefined;

/** 空きポートで立て、その口の URL を返す。 */
async function serve(): Promise<string> {
  server = startMockApi(0);

  await new Promise<void>((resolve) => {
    server?.once("listening", () => resolve());
  });

  return `http://localhost:${(server.address() as AddressInfo).port}`;
}

afterEach(() => {
  server?.close();
  server = undefined;
});

describe("startMockApi", () => {
  // ----- 正常系 -----
  it("契約にある口を、生成ハンドラの応答で返す", async () => {
    const response = await fetch(`${await serve()}/v1/products/categories`);

    expect(response.status).toBe(200);
    expect(Array.isArray(await response.json())).toBe(true);
  });

  // ----- 異常系 -----
  it("ハンドラの無い宛先は 502 で返す（素通しにすると自分自身へ向き直る）", async () => {
    const response = await fetch(`${await serve()}/v1/does-not-exist`);

    expect(response.status).toBe(502);
  });
});
