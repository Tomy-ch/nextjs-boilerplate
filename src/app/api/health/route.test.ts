import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET", () => {
  // ----- 正常系 -----
  it("生存していることを 200 で返す", () => {
    expect(GET().status).toBe(200);
  });

  it("生存していること以外を答えない", async () => {
    await expect(GET().json()).resolves.toEqual({ status: "ok" });
  });

  it("JSON として読める形で返す", () => {
    expect(GET().headers.get("content-type")).toContain("application/json");
  });
});
