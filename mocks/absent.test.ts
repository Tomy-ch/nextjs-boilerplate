import { type HttpHandler, HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ABSENT_IDENTIFIER, absentHandlers } from "./absent";

/** 契約から組み立てた一式を模した相手。具体的な口と、パラメータ区間を持つ口を混ぜる。 */
const handlers = [
  http.get("https://mock.test/items/latest", () => HttpResponse.json({ from: "latest" })),
  http.get("https://mock.test:8443/ping", () => HttpResponse.json({ from: "ping" })),
  http.get("https://mock.test/items/:itemId", () => HttpResponse.json({ from: "item" })),
  http.patch("https://mock.test/items/:itemId", () => HttpResponse.json({ from: "item-update" })),
  http.get("https://mock.test/nested/:id/:subId", () => HttpResponse.json({ from: "child" })),
];

const server = setupServer(...absentHandlers(handlers), ...handlers);

/** 組み立てた口を、method とパスの組で並べる。並び順は約束していないので整列して比べる。 */
function endpointsOf(built: readonly HttpHandler[]): string[] {
  return built
    .map((handler) => `${String(handler.info.method)} ${String(handler.info.path)}`)
    .sort();
}

describe("absentHandlers", () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
  });

  afterAll(() => {
    server.close();
  });

  // ----- 正常系 -----
  it("予約した識別子をパスに持つ要求には、本文を持たない 404 を返す", async () => {
    const response = await fetch(`https://mock.test/items/${ABSENT_IDENTIFIER}`);

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });

  it("契約が持つ method なら、読み取り以外の要求も 404 にする", async () => {
    const response = await fetch(`https://mock.test/items/${ABSENT_IDENTIFIER}`, {
      method: "PATCH",
    });

    expect(response.status).toBe(404);
  });

  it("どの区間に置かれた識別子でも 404 にする", async () => {
    const response = await fetch(`https://mock.test/nested/x/${ABSENT_IDENTIFIER}`);

    expect(response.status).toBe(404);
  });

  it("予約していない識別子の要求は、一式の口へ素通しする", async () => {
    const response = await fetch("https://mock.test/items/0001");

    expect(await response.json()).toEqual({ from: "item" });
  });

  it("予約した識別子を含むだけの識別子は、一式の口へ素通しする", async () => {
    const response = await fetch(`https://mock.test/items/${ABSENT_IDENTIFIER}-1`);

    expect(await response.json()).toEqual({ from: "item" });
  });

  it("パラメータ区間を持たない口には組み立てない。scheme や port のコロンは区間ではない", () => {
    expect(endpointsOf(absentHandlers(handlers))).toEqual([
      "GET https://mock.test/items/:itemId",
      "GET https://mock.test/nested/:id/:subId",
      "PATCH https://mock.test/items/:itemId",
    ]);
  });

  it("同じ method とパスの口が重なっても、1 つだけ組み立てる", () => {
    expect(absentHandlers([...handlers, ...handlers])).toHaveLength(3);
  });

  // ----- 異常系 -----
  it("契約に無い method の要求は受けず、未処理として落とす", async () => {
    const unhandled: string[] = [];
    const record = ({ request }: { request: Request }) => {
      unhandled.push(request.method);
    };

    server.events.on("request:unhandled", record);

    await expect(
      fetch(`https://mock.test/items/${ABSENT_IDENTIFIER}`, { method: "DELETE" }),
    ).rejects.toThrow();

    server.events.removeListener("request:unhandled", record);

    expect(unhandled).toEqual(["DELETE"]);
  });
});
