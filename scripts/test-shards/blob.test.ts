import { describe, expect, it } from "vitest";

import { readBlobTotal } from "./blob";

describe("readBlobTotal", () => {
  // ----- 正常系 -----
  it("台の書いた結果なら、割った台数を返す", () => {
    expect(readBlobTotal("blob-2-4.json")).toBe(4);
  });

  // ----- 異常系 -----
  it("台の書いた結果でなければ undefined を返す", () => {
    expect(readBlobTotal("coverage-final.json")).toBeUndefined();
  });

  it("0 台目や 0 台数は綴りとして受け付けない", () => {
    expect(readBlobTotal("blob-0-4.json")).toBeUndefined();
    expect(readBlobTotal("blob-1-0.json")).toBeUndefined();
  });
});
