import { describe, expect, it, vi } from "vitest";

import { absentHandlers } from "./absent";
import { handlers } from "./handlers";
import { mockServer } from "./node";

vi.mock("./handlers", async () => {
  const { HttpResponse, http } = await import("msw");

  return {
    handlers: [
      http.get("https://mock.test/items/latest", () => HttpResponse.json({})),
      http.get("https://mock.test/items/:itemId", () => HttpResponse.json({})),
    ],
  };
});

describe("mockServer", () => {
  // ----- 正常系 -----
  it("予約した識別子の口を、契約の口より前に並べる", () => {
    const listed = mockServer.listHandlers();
    const absent = absentHandlers(handlers);

    expect(listed).toHaveLength(absent.length + handlers.length);
    expect(
      listed
        .slice(0, absent.length)
        .map((handler) => ("info" in handler ? handler.info.header : "")),
    ).toEqual(["GET https://mock.test/items/:itemId"]);
    expect(listed.slice(absent.length).every((handler, index) => handler === handlers[index])).toBe(
      true,
    );
  });
});
