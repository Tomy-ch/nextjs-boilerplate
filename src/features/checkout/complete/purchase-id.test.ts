import { describe, expect, it } from "vitest";

import { PURCHASE_PARAM } from "../paths";
import { readPurchaseId } from "./purchase-id";

const PURCHASE_ID = "0195f0c2-0000-7000-9000-000000000001";

describe("readPurchaseId", () => {
  // ----- 正常系 -----
  it("検索条件が指す購入を読む", () => {
    expect(readPurchaseId({ [PURCHASE_PARAM]: PURCHASE_ID })).toBe(PURCHASE_ID);
  });

  // ----- 異常系 -----
  it("指定が無ければ読まない", () => {
    expect(readPurchaseId({})).toBeNull();
  });

  it("契約が受け付けない形の値を渡さない", () => {
    expect(readPurchaseId({ [PURCHASE_PARAM]: "not-a-purchase" })).toBeNull();
  });

  it("同じ条件が繰り返されていたら読まない", () => {
    expect(readPurchaseId({ [PURCHASE_PARAM]: [PURCHASE_ID, PURCHASE_ID] })).toBeNull();
  });
});
