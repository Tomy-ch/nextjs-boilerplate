// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  COUPON_DISCOUNT_KIND_MISSING_MESSAGE,
  COUPON_MIN_PURCHASE_INVALID_MESSAGE,
  type CouponDiscountValues,
  EMPTY_COUPON_DISCOUNT_VALUES,
} from "../../coupon-discount";
import {
  COUPON_SCOPE_KIND_MISSING_MESSAGE,
  type CouponScopeValues,
  EMPTY_COUPON_SCOPE_VALUES,
} from "../../coupon-scope";
import { EMPTY_ISSUE_OWN_VALUES, ISSUE_EXPIRES_AT_MISSING_MESSAGE } from "./issue-rules";
import { useIssueValues } from "./use-issue-values";

const VALID_DISCOUNT: CouponDiscountValues = { kind: "flat", value: "5", maxAmount: "" };

const VALID_SCOPE: CouponScopeValues = { ...EMPTY_COUPON_SCOPE_VALUES, kind: "all" };

function renderValues() {
  return renderHook(() => useIssueValues());
}

type Rendered = ReturnType<typeof renderValues>["result"];

function fillValid(result: Rendered): void {
  act(() => result.current.setOwn("expiresAt", "2026-12-31T23:59"));
  act(() => result.current.setDiscount(VALID_DISCOUNT));
  act(() => result.current.setScope(VALID_SCOPE));
}

function touchAll(result: Rendered): boolean {
  let passed = false;

  act(() => {
    passed = result.current.touchAll();
  });

  return passed;
}

describe("useIssueValues", () => {
  // ----- 正常系 -----
  it("何も打っていない値から始め、誤りも書きかけも持たない", () => {
    const { result } = renderValues();

    expect(result.current.own).toBe(EMPTY_ISSUE_OWN_VALUES);
    expect(result.current.discount).toBe(EMPTY_COUPON_DISCOUNT_VALUES);
    expect(result.current.scope).toBe(EMPTY_COUPON_SCOPE_VALUES);
    expect(result.current.errors).toEqual({});
    expect(result.current.dirty).toBe(false);
  });

  it("クーポン自身の 1 項目だけを書き換える", () => {
    const { result } = renderValues();

    act(() => result.current.setOwn("minPurchaseAmount", "50"));

    expect(result.current.own).toEqual({ ...EMPTY_ISSUE_OWN_VALUES, minPurchaseAmount: "50" });
  });

  it("すべてが正しければ、全項目に印を付けても誤りを出さず、通ると返す", () => {
    const { result } = renderValues();
    fillValid(result);

    expect(touchAll(result)).toBe(true);
    expect(result.current.errors).toEqual({});
  });

  it("元に戻すと、値も触れた印も書きかけも初めの状態へ戻す", () => {
    const { result } = renderValues();
    fillValid(result);
    touchAll(result);

    act(() => result.current.reset());

    expect(result.current.own).toBe(EMPTY_ISSUE_OWN_VALUES);
    expect(result.current.discount).toBe(EMPTY_COUPON_DISCOUNT_VALUES);
    expect(result.current.scope).toBe(EMPTY_COUPON_SCOPE_VALUES);
    expect(result.current.errors).toEqual({});
    expect(result.current.dirty).toBe(false);
  });

  // ----- 異常系 -----
  it("触れた項目の誤りだけを出す", () => {
    const { result } = renderValues();

    act(() => result.current.setOwn("minPurchaseAmount", "abc"));
    act(() => result.current.touch("expiresAt"));

    expect(result.current.errors).toEqual({ expiresAt: ISSUE_EXPIRES_AT_MISSING_MESSAGE });
  });

  it("何も打たずに全項目へ印を付ければ、通らないと返して残っている誤りをまとめて出す", () => {
    const { result } = renderValues();

    expect(touchAll(result)).toBe(false);
    expect(result.current.errors).toEqual({
      expiresAt: ISSUE_EXPIRES_AT_MISSING_MESSAGE,
      discountKind: COUPON_DISCOUNT_KIND_MISSING_MESSAGE,
      scopeKind: COUPON_SCOPE_KIND_MISSING_MESSAGE,
    });
  });

  it("全項目へ印を付けた後は、触れていない項目の誤りもその場で出す", () => {
    const { result } = renderValues();
    fillValid(result);
    touchAll(result);

    act(() => result.current.setOwn("minPurchaseAmount", "abc"));

    expect(result.current.errors).toEqual({
      minPurchaseAmount: COUPON_MIN_PURCHASE_INVALID_MESSAGE,
    });
  });
});
