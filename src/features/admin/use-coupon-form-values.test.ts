// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { type CouponDiscountValues, EMPTY_COUPON_DISCOUNT_VALUES } from "./coupon-discount";
import { type CouponScopeValues, EMPTY_COUPON_SCOPE_VALUES } from "./coupon-scope";
import {
  type CouponFormField,
  type CouponFormRead,
  useCouponFormValues,
} from "./use-coupon-form-values";

type OwnField = "name" | "note";

const EMPTY_OWN: Readonly<Record<OwnField, string>> = { name: "", note: "" };

const VALID_DISCOUNT: CouponDiscountValues = { kind: "flat", value: "5", maxAmount: "" };

const VALID_SCOPE: CouponScopeValues = { ...EMPTY_COUPON_SCOPE_VALUES, kind: "all" };

const read: CouponFormRead<OwnField> = (own, discount, scope) => {
  const errors: Partial<Record<CouponFormField<OwnField>, string>> = {};

  if (own.name === "") errors.name = "名前の文言";
  if (own.note === "x") errors.note = "備考の文言";
  if (discount.kind === "") errors.discountKind = "種別の文言";
  if (discount.value === "x") errors.discountValue = "額の文言";
  if (scope.kind === "") errors.scopeKind = "範囲の文言";
  if (scope.categoryId === "x") errors.scopeCategoryId = "カテゴリの文言";
  if (scope.productId === "x") errors.scopeProductId = "商品の文言";

  return Object.keys(errors).length === 0 ? { ok: true } : { ok: false, errors };
};

function renderValues(reading: CouponFormRead<OwnField> = read) {
  return renderHook(() => useCouponFormValues(EMPTY_OWN, reading));
}

type Rendered = ReturnType<typeof renderValues>["result"];

function fillValid(result: Rendered): void {
  act(() => result.current.setOwn("name", "春"));
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

describe("useCouponFormValues", () => {
  // ----- 正常系 -----
  it("渡された空の値と、何も打っていない値引き・範囲から始め、誤りも書きかけも持たない", () => {
    const { result } = renderValues();

    expect(result.current.own).toBe(EMPTY_OWN);
    expect(result.current.discount).toBe(EMPTY_COUPON_DISCOUNT_VALUES);
    expect(result.current.scope).toBe(EMPTY_COUPON_SCOPE_VALUES);
    expect(result.current.errors).toEqual({});
    expect(result.current.dirty).toBe(false);
  });

  it("画面自身の 1 欄だけを書き換え、書きかけになる", () => {
    const { result } = renderValues();

    act(() => result.current.setOwn("note", "メモ"));

    expect(result.current.own).toEqual({ name: "", note: "メモ" });
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

  it("今の値を判定に掛ける", () => {
    const reading = vi.fn<CouponFormRead<OwnField>>(() => ({ ok: true }));
    const { result } = renderValues(reading);

    act(() => result.current.setOwn("name", "春"));

    expect(reading).toHaveBeenLastCalledWith(
      { name: "春", note: "" },
      EMPTY_COUPON_DISCOUNT_VALUES,
      EMPTY_COUPON_SCOPE_VALUES,
    );
  });

  it("触れた欄を直せば誤りが消える", () => {
    const { result } = renderValues();

    act(() => result.current.touch("name"));
    act(() => result.current.setOwn("name", "春"));

    expect(result.current.errors).toEqual({});
  });

  it("すべてが通れば、全欄に印を付けても誤りを出さず、通ると返す", () => {
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

    expect(result.current.own).toBe(EMPTY_OWN);
    expect(result.current.discount).toBe(EMPTY_COUPON_DISCOUNT_VALUES);
    expect(result.current.scope).toBe(EMPTY_COUPON_SCOPE_VALUES);
    expect(result.current.errors).toEqual({});
    expect(result.current.dirty).toBe(false);
  });

  // ----- 異常系 -----
  it("打っただけでは触れたことにならず、誤りを出さない", () => {
    const { result } = renderValues();

    act(() => result.current.setOwn("note", "x"));

    expect(result.current.errors).toEqual({});
  });

  it("触れた欄の誤りだけを出す", () => {
    const { result } = renderValues();

    act(() => result.current.setOwn("note", "x"));
    act(() => result.current.touch("name"));

    expect(result.current.errors).toEqual({ name: "名前の文言" });
  });

  it("値引きを選び直すと種別だけに触れ、額の誤りはまだ出さない", () => {
    const { result } = renderValues();

    act(() => result.current.setDiscount({ kind: "flat", value: "x", maxAmount: "" }));

    expect(result.current.errors).toEqual({});
  });

  it("値引きの種別を空に戻せば、種別の誤りをその場で出す", () => {
    const { result } = renderValues();

    act(() => result.current.setDiscount(EMPTY_COUPON_DISCOUNT_VALUES));

    expect(result.current.errors).toEqual({ discountKind: "種別の文言" });
  });

  it("範囲の種別を空のまま選べば、種別の誤りをその場で出す", () => {
    const { result } = renderValues();

    act(() => result.current.setScope(EMPTY_COUPON_SCOPE_VALUES));

    expect(result.current.errors).toEqual({ scopeKind: "範囲の文言" });
  });

  it("カテゴリを選び直せばカテゴリに触れ、商品には触れない", () => {
    const { result } = renderValues(() => ({
      ok: false,
      errors: { scopeCategoryId: "カテゴリの文言", scopeProductId: "商品の文言" },
    }));

    act(() =>
      result.current.setScope({ ...EMPTY_COUPON_SCOPE_VALUES, kind: "category", categoryId: "x" }),
    );

    expect(result.current.errors).toEqual({ scopeCategoryId: "カテゴリの文言" });
  });

  it("商品を選び直せば商品に触れ、カテゴリには触れない", () => {
    const { result } = renderValues(() => ({
      ok: false,
      errors: { scopeCategoryId: "カテゴリの文言", scopeProductId: "商品の文言" },
    }));

    act(() =>
      result.current.setScope({
        ...EMPTY_COUPON_SCOPE_VALUES,
        kind: "product",
        productId: "x",
        productName: "ワイヤレスイヤホン",
      }),
    );

    expect(result.current.errors).toEqual({ scopeProductId: "商品の文言" });
  });

  it("範囲の種別だけを選んだ時点では、まだ選んでいない対象の誤りを出さない", () => {
    const { result } = renderValues(() => ({
      ok: false,
      errors: { scopeCategoryId: "カテゴリの文言", scopeProductId: "商品の文言" },
    }));

    act(() => result.current.setScope({ ...EMPTY_COUPON_SCOPE_VALUES, kind: "category" }));

    expect(result.current.errors).toEqual({});
  });

  it("何も打たずに全欄へ印を付ければ、通らないと返して残っている誤りをまとめて出す", () => {
    const { result } = renderValues();

    expect(touchAll(result)).toBe(false);
    expect(result.current.errors).toEqual({
      name: "名前の文言",
      discountKind: "種別の文言",
      scopeKind: "範囲の文言",
    });
  });

  it("全欄へ印を付けた後は、触れていない欄の誤りもその場で出す", () => {
    const { result } = renderValues();
    fillValid(result);
    touchAll(result);

    act(() => result.current.setOwn("note", "x"));

    expect(result.current.errors).toEqual({ note: "備考の文言" });
  });

  it("全欄へ印を付けた後に 1 欄へ触れても、すべての誤りを出し続ける", () => {
    const { result } = renderValues();
    touchAll(result);

    act(() => result.current.touch("name"));

    expect(result.current.errors).toEqual({
      name: "名前の文言",
      discountKind: "種別の文言",
      scopeKind: "範囲の文言",
    });
  });
});
