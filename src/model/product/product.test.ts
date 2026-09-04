import { describe, expect, it } from "vitest";

import { isDiscontinued, toProductId } from "./product";

const RAW_ID = "0195f0c2-0000-7000-8000-000000000001";

describe("toProductId", () => {
  it("受け取った文字列をそのまま識別子として返す", () => {
    expect(toProductId(RAW_ID)).toBe(RAW_ID);
  });

  it("brand を付けても JSON を跨いだ値は素の文字列のまま変わらない", () => {
    const line = { productId: toProductId(RAW_ID) };

    expect(JSON.parse(JSON.stringify(line))).toEqual({ productId: RAW_ID });
  });
});

describe("isDiscontinued", () => {
  // ----- 正常系 -----
  it("廃番日時を持つ商品を廃番とする", () => {
    expect(isDiscontinued({ discontinuedAt: new Date("2026-09-05T00:00:00.000Z") })).toBe(true);
  });

  it("廃番日時を持たない商品を廃番としない", () => {
    expect(isDiscontinued({ discontinuedAt: null })).toBe(false);
  });

  it("現在時刻と比べない", () => {
    const future = new Date(Date.now() + 86_400_000);

    expect(isDiscontinued({ discontinuedAt: future })).toBe(true);
  });
});
