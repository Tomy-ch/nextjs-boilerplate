import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ABSENT_IDENTIFIER, absentHandlers } from "./absent";

/** 契約から組み立てた一式を模した相手。具体的な口と、パラメータ区間を持つ口を混ぜる。 */
const handlers = [
  http.get("https://mock.test/items/latest", () => HttpResponse.json({ from: "latest" })),
  http.get("https://mock.test/items/:itemId", () => HttpResponse.json({ from: "item" })),
  http.patch("https://mock.test/items/:itemId", () => HttpResponse.json({ from: "item-update" })),
  http.get("https://mock.test/nested/:id/:subId", () => HttpResponse.json({ from: "child" })),
];

const server = setupServer(...absentHandlers(handlers), ...handlers);

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

  it("method を問わず、予約した識別子を持つ要求を 404 にする", async () => {
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

  it("パラメータ区間を持たない具体的な口は、一式の応答のまま残す", async () => {
    const response = await fetch("https://mock.test/items/latest");

    expect(await response.json()).toEqual({ from: "latest" });
  });

  it("同じパスの口が複数あっても、パス 1 つにつき 1 つだけ組み立てる", () => {
    expect(absentHandlers(handlers).map((handler) => String(handler.info.path))).toEqual([
      "https://mock.test/items/:itemId",
      "https://mock.test/nested/:id/:subId",
    ]);
  });
});
