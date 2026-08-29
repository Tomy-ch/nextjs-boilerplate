import { describe, expect, it } from "vitest";

import { portOf, servesMockApi } from "./build";

describe("portOf", () => {
  // ----- 正常系 -----
  it("URL が名乗ったポートを読む", () => {
    expect(portOf("http://localhost:8080")).toBe(8080);
  });

  it("http の既定のポートを補う", () => {
    expect(portOf("http://example.test/v1")).toBe(80);
  });

  it("https の既定のポートを補う", () => {
    expect(portOf("https://example.test")).toBe(443);
  });

  // ----- 異常系 -----
  it("URL として読めなければ投げる", () => {
    expect(() => portOf("8080")).toThrow();
  });
});

describe("servesMockApi", () => {
  // ----- 正常系 -----
  it("mock を名乗る build は取得先を自分で立てる", () => {
    expect(servesMockApi("mock")).toBe(true);
  });

  it("live を名乗る build は立てない", () => {
    expect(servesMockApi("live")).toBe(false);
  });

  it("名乗りが無い build は立てない", () => {
    expect(servesMockApi(undefined)).toBe(false);
  });
});
