import { describe, expect, it } from "vitest";

import { toCouponId } from "./coupon";

const RAW_ID = "0193a1c0-0001-7000-8000-000000000002";

describe("toCouponId", () => {
  // ----- 正常系 -----
  it("受け取った文字列をそのまま識別子として返す", () => {
    expect(toCouponId(RAW_ID)).toBe(RAW_ID);
  });

  it("brand を付けても JSON を跨いだ値は素の文字列のまま変わらない", () => {
    const selection = { couponId: toCouponId(RAW_ID) };

    expect(JSON.parse(JSON.stringify(selection))).toEqual({ couponId: RAW_ID });
  });
});
