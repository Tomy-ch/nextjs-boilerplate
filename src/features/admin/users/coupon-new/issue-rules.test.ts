import { describe, expect, it } from "vitest";

import {
  COUPON_DISCOUNT_FLAT_INVALID_MESSAGE,
  COUPON_DISCOUNT_KIND_MISSING_MESSAGE,
  type CouponDiscountValues,
  EMPTY_COUPON_DISCOUNT_VALUES,
} from "../../coupon-discount";
import {
  COUPON_SCOPE_CATEGORY_MISSING_MESSAGE,
  COUPON_SCOPE_KIND_MISSING_MESSAGE,
  type CouponScopeValues,
  EMPTY_COUPON_SCOPE_VALUES,
} from "../../coupon-scope";
import {
  EMPTY_ISSUE_OWN_VALUES,
  ISSUE_EXPIRES_AT_MISSING_MESSAGE,
  ISSUE_MIN_PURCHASE_INVALID_MESSAGE,
  ISSUE_USABLE_AFTER_EXPIRY_MESSAGE,
  ISSUE_USABLE_FROM_INVALID_MESSAGE,
  type IssueOwnValues,
  type IssueSubmission,
  submissionOf,
  toCouponIssueDraft,
} from "./issue-rules";

const CATEGORY_ID = "0195f0c2-0000-7000-8000-000000000011";

const OWN: IssueOwnValues = {
  expiresAt: "2026-12-31T14:59:00.000Z",
  usableFrom: "2026-12-01T00:00:00.000Z",
  minPurchaseAmount: "50",
};

const DISCOUNT: CouponDiscountValues = { kind: "flat", value: "5", maxAmount: "" };

const SCOPE: CouponScopeValues = { kind: "all", categoryId: "", productId: "", productName: "" };

function submission(
  own: Partial<IssueOwnValues> = {},
  discount: CouponDiscountValues = DISCOUNT,
  scope: CouponScopeValues = SCOPE,
): IssueSubmission {
  return { own: { ...OWN, ...own }, discount, scope };
}

describe("EMPTY_ISSUE_OWN_VALUES", () => {
  // ----- 正常系 -----
  it("3 項目とも空文字から始める", () => {
    expect(EMPTY_ISSUE_OWN_VALUES).toStrictEqual({
      expiresAt: "",
      usableFrom: "",
      minPurchaseAmount: "",
    });
  });
});

describe("submissionOf", () => {
  // ----- 正常系 -----
  it("有効期限と利用開始だけを瞬間へ確定させ、最低購入額は打たれたまま持つ", () => {
    const own: IssueOwnValues = {
      expiresAt: "2026-12-31T23:59",
      usableFrom: "2026-12-01T09:00",
      minPurchaseAmount: "49.99",
    };

    expect(submissionOf(own, DISCOUNT, SCOPE).own).toStrictEqual({
      expiresAt: "2026-12-31T14:59:00.000Z",
      usableFrom: "2026-12-01T00:00:00.000Z",
      minPurchaseAmount: "49.99",
    });
  });

  it("値引きと範囲は渡されたものをそのまま持つ", () => {
    const result = submissionOf(EMPTY_ISSUE_OWN_VALUES, DISCOUNT, SCOPE);

    expect(result.discount).toBe(DISCOUNT);
    expect(result.scope).toBe(SCOPE);
  });

  it("空の日時は空のまま持つ", () => {
    expect(submissionOf(EMPTY_ISSUE_OWN_VALUES, DISCOUNT, SCOPE).own).toStrictEqual(
      EMPTY_ISSUE_OWN_VALUES,
    );
  });

  // ----- 異常系 -----
  it("読めない日時は空文字として持つ", () => {
    const result = submissionOf(
      { ...EMPTY_ISSUE_OWN_VALUES, expiresAt: "abc", usableFrom: "2026-13-40T99:99" },
      DISCOUNT,
      SCOPE,
    );

    expect(result.own.expiresAt).toBe("");
    expect(result.own.usableFrom).toBe("");
  });
});

describe("toCouponIssueDraft", () => {
  // ----- 正常系 -----
  it("揃った一式を、日時は Date・最低購入額は最小単位として組む", () => {
    expect(toCouponIssueDraft(submission())).toStrictEqual({
      ok: true,
      draft: {
        discount: { kind: "flat", value: "5" },
        scope: { kind: "all" },
        expiresAt: new Date("2026-12-31T14:59:00.000Z"),
        usableFrom: new Date("2026-12-01T00:00:00.000Z"),
        minPurchaseAmount: 5000,
      },
    });
  });

  it("利用開始が空なら発行した時点から使える null で組む", () => {
    const reading = toCouponIssueDraft(submission({ usableFrom: "" }));

    expect(reading.ok && reading.draft.usableFrom).toBeNull();
  });

  it("最低購入額が空なら条件無しの null で組む", () => {
    const reading = toCouponIssueDraft(submission({ minPurchaseAmount: "" }));

    expect(reading.ok && reading.draft.minPurchaseAmount).toBeNull();
  });

  it.each([
    { amount: "49.99", minor: 4999 },
    { amount: "50", minor: 5000 },
  ])("最低購入額が $amount なら最小単位の $minor で組む", ({ amount, minor }) => {
    const reading = toCouponIssueDraft(submission({ minPurchaseAmount: amount }));

    expect(reading.ok && reading.draft.minPurchaseAmount).toBe(minor);
  });

  it("利用開始が有効期限の 1 分前なら受け付ける", () => {
    expect(
      toCouponIssueDraft(
        submission({
          expiresAt: "2026-12-31T14:59:00.000Z",
          usableFrom: "2026-12-31T14:58:00.000Z",
        }),
      ).ok,
    ).toBe(true);
  });

  it("定率の値引きと、カテゴリに絞った範囲を契約の形で組む", () => {
    const reading = toCouponIssueDraft(
      submission(
        {},
        { kind: "rate", value: "10", maxAmount: "20" },
        { kind: "category", categoryId: CATEGORY_ID, productId: "", productName: "" },
      ),
    );

    expect(reading.ok && reading.draft.discount).toStrictEqual({
      kind: "rate",
      value: "0.10",
      maxAmount: 2000,
    });
    expect(reading.ok && reading.draft.scope).toStrictEqual({
      kind: "category",
      categoryId: CATEGORY_ID,
    });
  });

  // ----- 異常系 -----
  it.each([
    { label: "空", expiresAt: "" },
    { label: "読めない綴り", expiresAt: "abc" },
  ])("有効期限が$labelなら、有効期限の欄に入力が無い文言を返す", ({ expiresAt }) => {
    expect(toCouponIssueDraft(submission({ expiresAt, usableFrom: "" }))).toStrictEqual({
      ok: false,
      errors: { expiresAt: ISSUE_EXPIRES_AT_MISSING_MESSAGE },
    });
  });

  it("利用開始が打たれていて読めなければ、利用開始の欄に文言を返す", () => {
    expect(toCouponIssueDraft(submission({ usableFrom: "abc" }))).toStrictEqual({
      ok: false,
      errors: { usableFrom: ISSUE_USABLE_FROM_INVALID_MESSAGE },
    });
  });

  it("利用開始が有効期限と同じなら、利用開始の欄に期限より前にする文言を返す", () => {
    expect(
      toCouponIssueDraft(
        submission({
          expiresAt: "2026-12-31T14:59:00.000Z",
          usableFrom: "2026-12-31T14:59:00.000Z",
        }),
      ),
    ).toStrictEqual({
      ok: false,
      errors: { usableFrom: ISSUE_USABLE_AFTER_EXPIRY_MESSAGE },
    });
  });

  it("有効期限が無ければ、利用開始との前後を比べない", () => {
    expect(
      toCouponIssueDraft(submission({ expiresAt: "", usableFrom: "2027-01-01T00:00:00.000Z" })),
    ).toStrictEqual({
      ok: false,
      errors: { expiresAt: ISSUE_EXPIRES_AT_MISSING_MESSAGE },
    });
  });

  it.each([
    { label: "0", amount: "0" },
    { label: "最小単位より細かい桁を持つ額", amount: "49.999" },
    { label: "数でない綴り", amount: "abc" },
  ])("最低購入額が$label（$amount）なら、最低購入額の欄に文言を返す", ({ amount }) => {
    expect(toCouponIssueDraft(submission({ minPurchaseAmount: amount }))).toStrictEqual({
      ok: false,
      errors: { minPurchaseAmount: ISSUE_MIN_PURCHASE_INVALID_MESSAGE },
    });
  });

  it("何も打っていなければ、必須の欄すべてに文言を返す", () => {
    expect(
      toCouponIssueDraft({
        own: EMPTY_ISSUE_OWN_VALUES,
        discount: EMPTY_COUPON_DISCOUNT_VALUES,
        scope: EMPTY_COUPON_SCOPE_VALUES,
      }),
    ).toStrictEqual({
      ok: false,
      errors: {
        discountKind: COUPON_DISCOUNT_KIND_MISSING_MESSAGE,
        scopeKind: COUPON_SCOPE_KIND_MISSING_MESSAGE,
        expiresAt: ISSUE_EXPIRES_AT_MISSING_MESSAGE,
      },
    });
  });

  it("値引きだけが読めなければ、値引きの欄の文言をそのまま返す", () => {
    expect(
      toCouponIssueDraft(submission({}, { kind: "flat", value: "0", maxAmount: "" })),
    ).toStrictEqual({
      ok: false,
      errors: { discountValue: COUPON_DISCOUNT_FLAT_INVALID_MESSAGE },
    });
  });

  it("範囲だけが読めなければ、範囲の欄の文言をそのまま返す", () => {
    expect(
      toCouponIssueDraft(
        submission({}, DISCOUNT, {
          kind: "category",
          categoryId: "",
          productId: "",
          productName: "",
        }),
      ),
    ).toStrictEqual({
      ok: false,
      errors: { scopeCategoryId: COUPON_SCOPE_CATEGORY_MISSING_MESSAGE },
    });
  });

  it("値引きと範囲とクーポン自身の誤りを 1 つの文言の一覧へまとめる", () => {
    expect(
      toCouponIssueDraft(
        submission(
          { minPurchaseAmount: "abc" },
          { kind: "flat", value: "0", maxAmount: "" },
          { kind: "category", categoryId: "", productId: "", productName: "" },
        ),
      ),
    ).toStrictEqual({
      ok: false,
      errors: {
        discountValue: COUPON_DISCOUNT_FLAT_INVALID_MESSAGE,
        scopeCategoryId: COUPON_SCOPE_CATEGORY_MISSING_MESSAGE,
        minPurchaseAmount: ISSUE_MIN_PURCHASE_INVALID_MESSAGE,
      },
    });
  });
});
