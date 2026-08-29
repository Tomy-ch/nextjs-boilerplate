import type { AddressInfo } from "node:net";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it } from "vitest";
// interception はこの setup が立てる。口の側は立てない（`serve.ts` の項）。
import "../vitest.setup.msw";

import { mockServer } from "./node";
import { startMockApi } from "./serve";

let server: ReturnType<typeof startMockApi> | undefined;

/**
 * 空きポートで口を立て、その URL を返す。
 *
 * @remarks
 * 応答は契約のハンドラではなくこの場で割り当てます。確かめたいのは**口が interception の応答を
 * そのまま出すこと**であって、契約が何を返すかではありません。契約に頼ると、サンプルを破棄した
 * fork でこのテストだけが落ちます。
 */
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
  it("interception が返した応答をそのまま HTTP へ出す", async () => {
    mockServer.use(http.get("*/probe", () => HttpResponse.json({ answered: true })));

    const response = await fetch(`${await serve()}/probe`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ answered: true });
  });

  it("クエリを落とさずに渡す", async () => {
    mockServer.use(
      http.get("*/probe", ({ request }) =>
        HttpResponse.json({ q: new URL(request.url).searchParams.get("q") }),
      ),
    );

    const response = await fetch(`${await serve()}/probe?q=%E6%9D%B1%E4%BA%AC`);

    await expect(response.json()).resolves.toEqual({ q: "東京" });
  });

  // ----- 異常系 -----
  it("ハンドラの無い宛先は 502 で返す（素通しにすると自分自身へ向き直る）", async () => {
    const response = await fetch(`${await serve()}/has-no-handler`);

    expect(response.status).toBe(502);
  });
});
