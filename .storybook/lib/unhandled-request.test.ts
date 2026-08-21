import { describe, expect, it } from "vitest";

import { shouldWarnUnhandled } from "./unhandled-request";

describe("shouldWarnUnhandled", () => {
  // ----- 正常系 -----
  it("横取りの対象である `/api/*` は報せる", () => {
    expect(shouldWarnUnhandled("http://localhost:6006/api/addresses?postalCode=150-0001")).toBe(
      true,
    );
  });

  it("下位のパスへ配信されていても、宛先が `/api/*` なら報せる", () => {
    expect(shouldWarnUnhandled("https://example.test/api/products/count")).toBe(true);
  });

  // ----- 異常系 -----
  it("カタログ自身の資材は報せない", () => {
    expect(shouldWarnUnhandled("http://localhost:6006/storybook/mockServiceWorker.js")).toBe(false);
  });

  it("接頭辞が一致するだけの宛先は報せない", () => {
    expect(shouldWarnUnhandled("http://localhost:6006/apiary")).toBe(false);
  });
});
