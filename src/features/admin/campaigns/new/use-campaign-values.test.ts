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
  CAMPAIGN_CODE_INVALID_MESSAGE,
  CAMPAIGN_DATE_MISSING_MESSAGE,
  CAMPAIGN_ENDS_BEFORE_START_MESSAGE,
  CAMPAIGN_EXPIRES_BEFORE_END_MESSAGE,
  CAMPAIGN_LIMIT_INVALID_MESSAGE,
  CAMPAIGN_PER_USER_OVER_TOTAL_MESSAGE,
  CAMPAIGN_USABLE_AFTER_EXPIRY_MESSAGE,
  type CampaignOwnValues,
  EMPTY_CAMPAIGN_OWN_VALUES,
} from "./campaign-rules";
import { CAMPAIGN_OWN_FIELDS } from "./form-state";
import { useCampaignValues } from "./use-campaign-values";

const VALID_OWN: CampaignOwnValues = {
  code: "SPRING-2026",
  startsAt: "2026-10-01T10:00",
  endsAt: "2026-10-10T10:00",
  couponExpiresAt: "2026-10-31T10:00",
  usableFrom: "",
  totalLimit: "100",
  perUserLimit: "2",
  minPurchaseAmount: "",
};

const VALID_DISCOUNT: CouponDiscountValues = { kind: "flat", value: "5", maxAmount: "" };

const VALID_SCOPE: CouponScopeValues = { ...EMPTY_COUPON_SCOPE_VALUES, kind: "all" };

function renderValues() {
  return renderHook(() => useCampaignValues());
}

type Rendered = ReturnType<typeof renderValues>["result"];

function fillValid(result: Rendered): void {
  for (const field of CAMPAIGN_OWN_FIELDS) {
    act(() => result.current.setOwn(field, VALID_OWN[field]));
  }

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

describe("useCampaignValues", () => {
  // ----- 正常系 -----
  it("何も打っていない値から始め、誤りも書きかけも持たない", () => {
    const { result } = renderValues();

    expect(result.current.own).toBe(EMPTY_CAMPAIGN_OWN_VALUES);
    expect(result.current.discount).toBe(EMPTY_COUPON_DISCOUNT_VALUES);
    expect(result.current.scope).toBe(EMPTY_COUPON_SCOPE_VALUES);
    expect(result.current.errors).toEqual({});
    expect(result.current.dirty).toBe(false);
  });

  it("キャンペーン自身の 1 項目だけを書き換える", () => {
    const { result } = renderValues();

    act(() => result.current.setOwn("code", "SPRING-2026"));

    expect(result.current.own).toEqual({ ...EMPTY_CAMPAIGN_OWN_VALUES, code: "SPRING-2026" });
  });

  it("打っただけでは触れたことにならず、誤りを出さない", () => {
    const { result } = renderValues();

    act(() => result.current.setOwn("code", "ab"));

    expect(result.current.errors).toEqual({});
  });

  it("触れた項目が正しければ誤りを出さない", () => {
    const { result } = renderValues();

    act(() => result.current.setOwn("code", "SPRING-2026"));
    act(() => result.current.touch("code"));

    expect(result.current.errors).toEqual({});
  });

  it("触れた項目を直せば誤りが消える", () => {
    const { result } = renderValues();

    act(() => result.current.touch("code"));
    act(() => result.current.setOwn("code", "SPRING-2026"));

    expect(result.current.errors.code).toBeUndefined();
  });

  it("値引きを渡された値で置き換える", () => {
    const { result } = renderValues();

    act(() => result.current.setDiscount(VALID_DISCOUNT));

    expect(result.current.discount).toBe(VALID_DISCOUNT);
  });

  it("範囲を渡された値で置き換える", () => {
    const { result } = renderValues();

    act(() => result.current.setScope(VALID_SCOPE));

    expect(result.current.scope).toBe(VALID_SCOPE);
  });

  it("すべてが正しければ、全項目に印を付けても誤りを出さず、通ると返す", () => {
    const { result } = renderValues();
    fillValid(result);

    expect(touchAll(result)).toBe(true);
    expect(result.current.errors).toEqual({});
  });

  it("キャンペーン自身の項目を書き換えれば書きかけになる", () => {
    const { result } = renderValues();

    act(() => result.current.setOwn("code", "S"));

    expect(result.current.dirty).toBe(true);
  });

  it("値引きを書き換えれば書きかけになる", () => {
    const { result } = renderValues();

    act(() => result.current.setDiscount(VALID_DISCOUNT));

    expect(result.current.dirty).toBe(true);
  });

  it("範囲を書き換えれば書きかけになる", () => {
    const { result } = renderValues();

    act(() => result.current.setScope(VALID_SCOPE));

    expect(result.current.dirty).toBe(true);
  });

  // ----- 異常系 -----
  it("触れた項目の誤りだけを出す", () => {
    const { result } = renderValues();

    act(() => result.current.touch("code"));

    expect(result.current.errors).toEqual({ code: CAMPAIGN_CODE_INVALID_MESSAGE });
  });

  it("触れた日時が空なら、日時が無いと伝える", () => {
    const { result } = renderValues();

    act(() => result.current.touch("startsAt"));

    expect(result.current.errors).toEqual({ startsAt: CAMPAIGN_DATE_MISSING_MESSAGE });
  });

  it("配布終了が配布開始より後でなければ配布終了の側へ誤りを付け、開始を直せば消える", () => {
    const { result } = renderValues();
    fillValid(result);
    act(() => result.current.touch("startsAt"));
    act(() => result.current.touch("endsAt"));

    act(() => result.current.setOwn("startsAt", "2026-10-20T10:00"));

    expect(result.current.errors).toEqual({ endsAt: CAMPAIGN_ENDS_BEFORE_START_MESSAGE });

    act(() => result.current.setOwn("startsAt", VALID_OWN.startsAt));

    expect(result.current.errors).toEqual({});
  });

  it("有効期限が配布終了より後でなければ有効期限の側へ誤りを付け、終了を直せば消える", () => {
    const { result } = renderValues();
    fillValid(result);
    act(() => result.current.touch("endsAt"));
    act(() => result.current.touch("couponExpiresAt"));

    act(() => result.current.setOwn("endsAt", "2026-11-05T10:00"));

    expect(result.current.errors).toEqual({
      couponExpiresAt: CAMPAIGN_EXPIRES_BEFORE_END_MESSAGE,
    });

    act(() => result.current.setOwn("endsAt", VALID_OWN.endsAt));

    expect(result.current.errors).toEqual({});
  });

  it("利用開始が有効期限より前でなければ利用開始の側へ誤りを付け、期限を直せば消える", () => {
    const { result } = renderValues();
    fillValid(result);
    act(() => result.current.setOwn("usableFrom", "2026-10-20T10:00"));
    act(() => result.current.touch("couponExpiresAt"));
    act(() => result.current.touch("usableFrom"));

    act(() => result.current.setOwn("couponExpiresAt", "2026-10-15T10:00"));

    expect(result.current.errors).toEqual({ usableFrom: CAMPAIGN_USABLE_AFTER_EXPIRY_MESSAGE });

    act(() => result.current.setOwn("couponExpiresAt", VALID_OWN.couponExpiresAt));

    expect(result.current.errors).toEqual({});
  });

  it("1 人あたりの上限が総枚数を超えれば 1 人あたりの側へ誤りを付け、総枚数を直せば消える", () => {
    const { result } = renderValues();
    fillValid(result);
    act(() => result.current.touch("totalLimit"));
    act(() => result.current.touch("perUserLimit"));

    act(() => result.current.setOwn("totalLimit", "1"));

    expect(result.current.errors).toEqual({ perUserLimit: CAMPAIGN_PER_USER_OVER_TOTAL_MESSAGE });

    act(() => result.current.setOwn("totalLimit", VALID_OWN.totalLimit));

    expect(result.current.errors).toEqual({});
  });

  it("値引きを選び直すと種別だけに触れ、額と上限の誤りはまだ出さない", () => {
    const { result } = renderValues();

    act(() => result.current.setDiscount({ kind: "rate", value: "abc", maxAmount: "x" }));

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

  it("商品の種別だけを選んだ時点では、まだ選んでいない商品の誤りを出さない", () => {
    const { result } = renderValues();

    act(() => result.current.setScope({ ...EMPTY_COUPON_SCOPE_VALUES, kind: "product" }));

    expect(result.current.errors).toEqual({});
  });

  it("何も打たずに全項目へ印を付ければ、通らないと返して残っている誤りをまとめて出す", () => {
    const { result } = renderValues();

    expect(touchAll(result)).toBe(false);
    expect(result.current.errors).toEqual({
      code: CAMPAIGN_CODE_INVALID_MESSAGE,
      startsAt: CAMPAIGN_DATE_MISSING_MESSAGE,
      endsAt: CAMPAIGN_DATE_MISSING_MESSAGE,
      couponExpiresAt: CAMPAIGN_DATE_MISSING_MESSAGE,
      totalLimit: CAMPAIGN_LIMIT_INVALID_MESSAGE,
      perUserLimit: CAMPAIGN_LIMIT_INVALID_MESSAGE,
      discountKind: COUPON_DISCOUNT_KIND_MISSING_MESSAGE,
      scopeKind: COUPON_SCOPE_KIND_MISSING_MESSAGE,
    });
  });

  it("全項目へ印を付けた後は、直した項目の誤りが消え、残りは出し続ける", () => {
    const { result } = renderValues();
    touchAll(result);

    act(() => result.current.setOwn("code", "SPRING-2026"));

    expect(result.current.errors.code).toBeUndefined();
    expect(result.current.errors.startsAt).toBe(CAMPAIGN_DATE_MISSING_MESSAGE);
  });

  it("全項目へ印を付けた後に 1 項目へ触れても、すべての誤りを出し続ける", () => {
    const { result } = renderValues();
    touchAll(result);

    act(() => result.current.touch("code"));

    expect(Object.keys(result.current.errors)).toHaveLength(8);
  });
});
