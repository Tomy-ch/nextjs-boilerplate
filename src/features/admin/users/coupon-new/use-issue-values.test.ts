// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  COUPON_DISCOUNT_KIND_MISSING_MESSAGE,
  type CouponDiscountValues,
  EMPTY_COUPON_DISCOUNT_VALUES,
} from "../../coupon-discount";
import {
  COUPON_SCOPE_CATEGORY_MISSING_MESSAGE,
  COUPON_SCOPE_KIND_MISSING_MESSAGE,
  COUPON_SCOPE_PRODUCT_MISSING_MESSAGE,
  type CouponScopeValues,
  EMPTY_COUPON_SCOPE_VALUES,
} from "../../coupon-scope";
import {
  EMPTY_ISSUE_OWN_VALUES,
  ISSUE_EXPIRES_AT_MISSING_MESSAGE,
  ISSUE_MIN_PURCHASE_INVALID_MESSAGE,
} from "./issue-rules";
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

  it("クーポン自身の項目を書き換えれば書きかけになる", () => {
    const { result } = renderValues();

    act(() => result.current.setOwn("minPurchaseAmount", "5"));

    expect(result.current.dirty).toBe(true);
  });

  it("値引きを渡された値で置き換え、書きかけになる", () => {
    const { result } = renderValues();

    act(() => result.current.setDiscount(VALID_DISCOUNT));

    expect(result.current.discount).toBe(VALID_DISCOUNT);
    expect(result.current.dirty).toBe(true);
  });

  it("範囲を渡された値で置き換え、書きかけになる", () => {
    const { result } = renderValues();

    act(() => result.current.setScope(VALID_SCOPE));

    expect(result.current.scope).toBe(VALID_SCOPE);
    expect(result.current.dirty).toBe(true);
  });

  it("触れた項目を直せば誤りが消える", () => {
    const { result } = renderValues();

    act(() => result.current.touch("expiresAt"));
    act(() => result.current.setOwn("expiresAt", "2026-12-31T23:59"));

    expect(result.current.errors.expiresAt).toBeUndefined();
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
  it("打っただけでは触れたことにならず、誤りを出さない", () => {
    const { result } = renderValues();

    act(() => result.current.setOwn("minPurchaseAmount", "abc"));

    expect(result.current.errors).toEqual({});
  });

  it("触れた項目の誤りだけを出す", () => {
    const { result } = renderValues();

    act(() => result.current.setOwn("minPurchaseAmount", "abc"));
    act(() => result.current.touch("expiresAt"));

    expect(result.current.errors).toEqual({ expiresAt: ISSUE_EXPIRES_AT_MISSING_MESSAGE });
  });

  it("値引きを選び直すと種別だけに触れ、額の誤りはまだ出さない", () => {
    const { result } = renderValues();

    act(() => result.current.setDiscount({ kind: "flat", value: "abc", maxAmount: "" }));

    expect(result.current.errors).toEqual({});
  });

  it("値引きの種別を空に戻せば、種別の誤りをその場で出す", () => {
    const { result } = renderValues();

    act(() => result.current.setDiscount(EMPTY_COUPON_DISCOUNT_VALUES));

    expect(result.current.errors).toEqual({ discountKind: COUPON_DISCOUNT_KIND_MISSING_MESSAGE });
  });

  it("範囲の種別を空のまま選べば、種別の誤りをその場で出す", () => {
    const { result } = renderValues();

    act(() => result.current.setScope(EMPTY_COUPON_SCOPE_VALUES));

    expect(result.current.errors).toEqual({ scopeKind: COUPON_SCOPE_KIND_MISSING_MESSAGE });
  });

  it("範囲の種別だけを選んだ時点では、まだ選んでいないカテゴリの誤りを出さない", () => {
    const { result } = renderValues();

    act(() => result.current.setScope({ ...EMPTY_COUPON_SCOPE_VALUES, kind: "category" }));

    expect(result.current.errors).toEqual({});
  });

  it("カテゴリを選び直せばカテゴリに触れ、読めなければ誤りを出す", () => {
    const { result } = renderValues();

    act(() =>
      result.current.setScope({ ...EMPTY_COUPON_SCOPE_VALUES, kind: "category", categoryId: "x" }),
    );

    expect(result.current.errors).toEqual({
      scopeCategoryId: COUPON_SCOPE_CATEGORY_MISSING_MESSAGE,
    });
  });

  it("商品を選び直せば商品に触れ、読めなければ誤りを出す", () => {
    const { result } = renderValues();

    act(() =>
      result.current.setScope({
        ...EMPTY_COUPON_SCOPE_VALUES,
        kind: "product",
        productId: "x",
        productName: "ワイヤレスイヤホン",
      }),
    );

    expect(result.current.errors).toEqual({ scopeProductId: COUPON_SCOPE_PRODUCT_MISSING_MESSAGE });
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
      minPurchaseAmount: ISSUE_MIN_PURCHASE_INVALID_MESSAGE,
    });
  });

  it("全項目へ印を付けた後に 1 項目へ触れても、すべての誤りを出し続ける", () => {
    const { result } = renderValues();
    touchAll(result);

    act(() => result.current.touch("expiresAt"));

    expect(result.current.errors).toEqual({
      expiresAt: ISSUE_EXPIRES_AT_MISSING_MESSAGE,
      discountKind: COUPON_DISCOUNT_KIND_MISSING_MESSAGE,
      scopeKind: COUPON_SCOPE_KIND_MISSING_MESSAGE,
    });
  });
});
