import { describe, expect, it } from "vitest";

import { PURCHASE_PARAM } from "../paths";
import { readPurchaseCode } from "./purchase-code";

const PURCHASE_CODE = "0195f0c2-0000-7000-9000-000000000001";

describe("readPurchaseCode", () => {
  // ----- 正常系 -----
  it("検索条件が指す購入を読む", () => {
    expect(readPurchaseCode({ [PURCHASE_PARAM]: PURCHASE_CODE })).toBe(PURCHASE_CODE);
  });

  // ----- 異常系 -----
  it("指定が無ければ読まない", () => {
    expect(readPurchaseCode({})).toBeNull();
  });

  it("空の指定は読まない", () => {
    expect(readPurchaseCode({ [PURCHASE_PARAM]: "" })).toBeNull();
  });

  it("契約が受け付ける長さを超える値を渡さない", () => {
    expect(readPurchaseCode({ [PURCHASE_PARAM]: "a".repeat(51) })).toBeNull();
  });

  it("同じ条件が繰り返されていたら読まない", () => {
    expect(readPurchaseCode({ [PURCHASE_PARAM]: [PURCHASE_CODE, PURCHASE_CODE] })).toBeNull();
  });
});
