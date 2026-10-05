import { describe, expect, it } from "vitest";

import { absentHandlers } from "./absent";
import { handlers } from "./handlers";
import { mockServer } from "./node";

describe("mockServer", () => {
  // ----- 正常系 -----
  it("予約した識別子の口を、契約の口より前に並べる", () => {
    const listed = mockServer.listHandlers();
    const head = listed.length - handlers.length;

    const contract = new Set<unknown>(handlers);

    expect(head).toBe(absentHandlers(handlers).length);
    expect(listed.slice(head).every((handler, index) => handler === handlers[index])).toBe(true);
    expect(listed.slice(0, head).some((handler) => contract.has(handler))).toBe(false);
  });
});
