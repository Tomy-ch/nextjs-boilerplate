import { describe, expect, it } from "vitest";

import { PURCHASE_STATUS } from "@/model/purchase/purchase-status";

import { availablePurchaseTransitions, PURCHASE_TRANSITION } from "./available-transitions";

describe("availablePurchaseTransitions", () => {
  // ----- 正常系 -----
  it("注文を受けたばかりの購入では、支払いと取り消しができる", () => {
    expect(availablePurchaseTransitions(PURCHASE_STATUS.UNPROCESSED)).toEqual([
      PURCHASE_TRANSITION.PAY,
      PURCHASE_TRANSITION.CANCEL,
    ]);
  });

  it("受付を待っている購入でも、支払いと取り消しができる", () => {
    for (const statusCode of [PURCHASE_STATUS.ACCEPTED, PURCHASE_STATUS.CONFIRMING]) {
      expect(availablePurchaseTransitions(statusCode)).toEqual([
        PURCHASE_TRANSITION.PAY,
        PURCHASE_TRANSITION.CANCEL,
      ]);
    }
  });

  it("支払いを終えた購入では、取り消しだけができる", () => {
    expect(availablePurchaseTransitions(PURCHASE_STATUS.PAID)).toEqual([
      PURCHASE_TRANSITION.CANCEL,
    ]);
  });

  it("処理中の購入では、取り消しだけができる", () => {
    expect(availablePurchaseTransitions(PURCHASE_STATUS.PROCESSING)).toEqual([
      PURCHASE_TRANSITION.CANCEL,
    ]);
  });

  it("進む操作を先に並べる", () => {
    expect(availablePurchaseTransitions(PURCHASE_STATUS.UNPROCESSED)[0]).toBe(
      PURCHASE_TRANSITION.PAY,
    );
  });

  // ----- 異常系 -----
  it("発送した購入にはできることが無い", () => {
    expect(availablePurchaseTransitions(PURCHASE_STATUS.SHIPPED)).toEqual([]);
  });

  it("終端に達した購入にはできることが無い", () => {
    for (const statusCode of [
      PURCHASE_STATUS.COMPLETED,
      PURCHASE_STATUS.DELIVERED,
      PURCHASE_STATUS.CANCELED,
    ]) {
      expect(availablePurchaseTransitions(statusCode)).toEqual([]);
    }
  });

  it("マスタに増えた業務キーには何も返さない", () => {
    expect(availablePurchaseTransitions(99)).toEqual([]);
  });
});
