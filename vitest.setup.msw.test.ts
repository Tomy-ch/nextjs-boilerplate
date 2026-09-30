import { once } from "node:events";
import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  passThroughOrigin,
  serveJson,
  serveStatus,
  serveWrite,
  type WriteMethod,
  watchFetch,
} from "./vitest.setup.msw";

const API = "https://api.example.test";

const servers: Server[] = [];

/** 本文 `ok` を返す本物のサーバを立て、その origin を返す。 */
async function startServer(): Promise<string> {
  const server = createServer((_request, response) => {
    response.end("ok");
  }).listen(0, "127.0.0.1");

  servers.push(server);
  await once(server, "listening");

  const address = server.address();

  if (address === null || typeof address === "string") {
    throw new Error("TCP の待ち受けになっていません");
  }

  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))),
  );
});

describe("serveJson", () => {
  // ----- 正常系 -----
  it("割り当てた本文を JSON の応答として返す", async () => {
    serveJson(`${API}/items`, { items: [1, 2] });

    const response = await fetch(`${API}/items`);

    expect(await response.json()).toEqual({ items: [1, 2] });
  });

  it("クエリ文字列が付いた要求も照合し、届いた順に積む", async () => {
    const requests = serveJson(`${API}/items`, {});

    await fetch(`${API}/items?page=1`);
    await fetch(`${API}/items?page=2`);

    expect(requests.map(({ url }) => url)).toEqual([`${API}/items?page=1`, `${API}/items?page=2`]);
  });

  // ----- 異常系 -----
  it("GET 以外の要求は受けず、本物の宛先が居ても届かせない", async () => {
    const origin = await startServer();
    const requests = serveJson(`${origin}/items`, {});

    await expect(fetch(`${origin}/items`, { method: "POST" })).rejects.toThrow();
    expect(requests).toEqual([]);
  });
});

describe("serveWrite", () => {
  // ----- 正常系 -----
  it.each<WriteMethod>(["post", "patch", "put", "delete"])(
    "%s を割り当てると、本文を返して要求を積む",
    async (method) => {
      const requests = serveWrite(method, `${API}/items/:id`, { saved: true });

      const response = await fetch(`${API}/items/7`, { method: method.toUpperCase() });

      expect(await response.json()).toEqual({ saved: true });
      expect(requests.map((request) => [request.method, request.url])).toEqual([
        [method.toUpperCase(), `${API}/items/7`],
      ]);
    },
  );

  it("積んだ要求から、送った本文を読み出せる", async () => {
    const requests = serveWrite("post", `${API}/items`, {});

    await fetch(`${API}/items`, { method: "POST", body: JSON.stringify({ name: "a" }) });

    expect(await requests[0]?.json()).toEqual({ name: "a" });
  });

  // ----- 異常系 -----
  it("割り当てたメソッド以外の要求は、本物の宛先が居ても届かせない", async () => {
    const origin = await startServer();
    const requests = serveWrite("post", `${origin}/items`, {});

    await expect(fetch(`${origin}/items`, { method: "PATCH" })).rejects.toThrow();
    expect(requests).toEqual([]);
  });
});

describe("serveStatus", () => {
  // ----- 正常系 -----
  it("割り当てた status を本文の無い応答として返す", async () => {
    serveStatus("get", `${API}/items/:id`, 404);

    const response = await fetch(`${API}/items/7`);

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });

  it("本文の無い成功応答でも、届いた要求を積む", async () => {
    const requests = serveStatus("delete", `${API}/items/:id`, 204);

    const response = await fetch(`${API}/items/7`, { method: "DELETE" });

    expect(response.status).toBe(204);
    expect(requests.map((request) => [request.method, request.url])).toEqual([
      ["DELETE", `${API}/items/7`],
    ]);
  });
});

describe("passThroughOrigin", () => {
  // ----- 正常系 -----
  it("名指しした origin への要求は、本物のサーバへ届く", async () => {
    const origin = await startServer();

    passThroughOrigin(origin);

    const response = await fetch(`${origin}/anything`);

    expect(await response.text()).toBe("ok");
  });

  it("名指しした origin へは、GET 以外の要求も素通しする", async () => {
    const origin = await startServer();

    passThroughOrigin(origin);

    const response = await fetch(`${origin}/anything`, { method: "POST", body: "x" });

    expect(await response.text()).toBe("ok");
  });

  // ----- 異常系 -----
  it("名指ししていない origin への要求は、本物のサーバが居ても落とす", async () => {
    const opened = await startServer();
    const closed = await startServer();

    passThroughOrigin(opened);

    await expect(fetch(`${closed}/anything`)).rejects.toThrow();
  });
});

describe("watchFetch", () => {
  // ----- 正常系 -----
  it("fetch へ渡した引数を記録する", async () => {
    serveJson(`${API}/items`, {});
    const watched = watchFetch();

    await fetch(`${API}/items`, { cache: "force-cache" });

    expect(watched).toHaveBeenCalledWith(`${API}/items`, { cache: "force-cache" });
  });

  it("応答は差し替えず、MSW のハンドラが返したものを通す", async () => {
    serveJson(`${API}/items`, { items: [1] });
    watchFetch();

    const response = await fetch(`${API}/items`);

    expect(await response.json()).toEqual({ items: [1] });
  });
});
