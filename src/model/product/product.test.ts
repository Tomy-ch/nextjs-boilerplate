import { describe, expect, it } from "vitest";

import { toProductId } from "./product";

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
