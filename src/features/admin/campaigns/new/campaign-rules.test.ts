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
  CAMPAIGN_CODE_INVALID_MESSAGE,
  CAMPAIGN_DATE_MISSING_MESSAGE,
  CAMPAIGN_ENDS_BEFORE_START_MESSAGE,
  CAMPAIGN_EXPIRES_BEFORE_END_MESSAGE,
  CAMPAIGN_LIMIT_INVALID_MESSAGE,
  CAMPAIGN_MIN_PURCHASE_INVALID_MESSAGE,
  CAMPAIGN_PER_USER_OVER_TOTAL_MESSAGE,
  CAMPAIGN_USABLE_AFTER_EXPIRY_MESSAGE,
  type CampaignOwnValues,
  type CampaignSubmission,
  EMPTY_CAMPAIGN_OWN_VALUES,
  normalizeCampaignCode,
  submissionOf,
  toCampaignDraft,
} from "./campaign-rules";

const CATEGORY_ID = "0195f0c2-0000-7000-8000-000000000011";

const OWN: CampaignOwnValues = {
  code: "summer-2026",
  startsAt: "2026-10-01T01:00:00.000Z",
  endsAt: "2026-10-31T15:00:00.000Z",
  couponExpiresAt: "2026-11-30T15:00:00.000Z",
  usableFrom: "2026-10-05T00:00:00.000Z",
  totalLimit: "100",
  perUserLimit: "2",
  minPurchaseAmount: "50",
};

const DISCOUNT: CouponDiscountValues = { kind: "flat", value: "5", maxAmount: "" };

const SCOPE: CouponScopeValues = { kind: "all", categoryId: "", productId: "", productName: "" };

/** 判定に掛ける一式を組む。渡した項目だけを差し替える。 */
function submission(
  own: Partial<CampaignOwnValues> = {},
  discount: CouponDiscountValues = DISCOUNT,
  scope: CouponScopeValues = SCOPE,
): CampaignSubmission {
  return { own: { ...OWN, ...own }, discount, scope };
}

describe("normalizeCampaignCode", () => {
  // ----- 正常系 -----
  it("前後の空白を落として大文字へ揃える", () => {
    expect(normalizeCampaignCode(" ab-cd12ef ")).toBe("AB-CD12EF");
  });

  it("内側の空白とハイフンは残す", () => {
    expect(normalizeCampaignCode("ab cd-ef")).toBe("AB CD-EF");
  });

  it("空白だけなら空文字を返す", () => {
    expect(normalizeCampaignCode("   ")).toBe("");
  });
});

describe("submissionOf", () => {
  // ----- 正常系 -----
  it("日時の 4 項目だけを瞬間へ確定させ、ほかの項目は打たれたまま持つ", () => {
    const own: CampaignOwnValues = {
      code: "summer-2026",
      startsAt: "2026-10-01T10:00",
      endsAt: "2026-11-01T00:00",
      couponExpiresAt: "2026-12-01T00:00",
      usableFrom: "2026-10-05T09:00",
      totalLimit: "100",
      perUserLimit: "2",
      minPurchaseAmount: "50",
    };

    expect(submissionOf(own, DISCOUNT, SCOPE).own).toStrictEqual({
      code: "summer-2026",
      startsAt: "2026-10-01T01:00:00.000Z",
      endsAt: "2026-10-31T15:00:00.000Z",
      couponExpiresAt: "2026-11-30T15:00:00.000Z",
      usableFrom: "2026-10-05T00:00:00.000Z",
      totalLimit: "100",
      perUserLimit: "2",
      minPurchaseAmount: "50",
    });
  });

  it("値引きと範囲は渡されたものをそのまま持つ", () => {
    const result = submissionOf(EMPTY_CAMPAIGN_OWN_VALUES, DISCOUNT, SCOPE);

    expect(result.discount).toBe(DISCOUNT);
    expect(result.scope).toBe(SCOPE);
  });

  it("空の日時は空のまま持つ", () => {
    expect(submissionOf(EMPTY_CAMPAIGN_OWN_VALUES, DISCOUNT, SCOPE).own).toStrictEqual(
      EMPTY_CAMPAIGN_OWN_VALUES,
    );
  });

  // ----- 異常系 -----
  it("読めない日時は空文字として持つ", () => {
    const result = submissionOf(
      { ...OWN, startsAt: "abc", endsAt: "2026-13-40T99:99" },
      DISCOUNT,
      SCOPE,
    );

    expect(result.own.startsAt).toBe("");
    expect(result.own.endsAt).toBe("");
  });
});

describe("toCampaignDraft", () => {
  // ----- 正常系 -----
  it("揃った一式を、日時は Date・枚数は数・最低購入額は最小単位として組む", () => {
    expect(toCampaignDraft(submission())).toStrictEqual({
      ok: true,
      draft: {
        code: "SUMMER-2026",
        discount: { kind: "flat", value: "5" },
        scope: { kind: "all" },
        minPurchaseAmount: 5000,
        usableFrom: new Date("2026-10-05T00:00:00.000Z"),
        couponExpiresAt: new Date("2026-11-30T15:00:00.000Z"),
        startsAt: new Date("2026-10-01T01:00:00.000Z"),
        endsAt: new Date("2026-10-31T15:00:00.000Z"),
        totalLimit: 100,
        perUserLimit: 2,
      },
    });
  });

  it("コードは前後の空白を落として大文字へ揃えた綴りで組む", () => {
    const reading = toCampaignDraft(submission({ code: "  spring-sale " }));

    expect(reading.ok && reading.draft.code).toBe("SPRING-SALE");
  });

  it("最低購入額が空なら条件無しの null で組む", () => {
    const reading = toCampaignDraft(submission({ minPurchaseAmount: "" }));

    expect(reading.ok && reading.draft.minPurchaseAmount).toBeNull();
  });

  it("利用開始が空なら受け取った時点から使える null で組む", () => {
    const reading = toCampaignDraft(submission({ usableFrom: "" }));

    expect(reading.ok && reading.draft.usableFrom).toBeNull();
  });

  it("最低購入額の小数第 1 位までの綴りを、浮動小数を通さずに最小単位へ写す", () => {
    const reading = toCampaignDraft(submission({ minPurchaseAmount: "12.3" }));

    expect(reading.ok && reading.draft.minPurchaseAmount).toBe(1230);
  });

  it.each([
    { label: "最短の 8 文字", code: "ABCD-123" },
    { label: "最長の 32 文字", code: "A".repeat(32) },
    { label: "前後の空白を落とすと 32 文字", code: ` ${"A".repeat(32)}` },
  ])("コードが$labelなら受け付ける", ({ code }) => {
    expect(toCampaignDraft(submission({ code })).ok).toBe(true);
  });

  it("1 人あたりの上限が総枚数と等しければ受け付ける", () => {
    expect(toCampaignDraft(submission({ totalLimit: "2", perUserLimit: "2" })).ok).toBe(true);
  });

  it("配布終了が配布開始の 1 ミリ秒後なら受け付ける", () => {
    expect(
      toCampaignDraft(
        submission({ startsAt: "2026-10-01T01:00:00.000Z", endsAt: "2026-10-01T01:00:00.001Z" }),
      ).ok,
    ).toBe(true);
  });

  it("有効期限が配布終了の 1 ミリ秒後なら受け付ける", () => {
    expect(
      toCampaignDraft(
        submission({
          endsAt: "2026-10-31T15:00:00.000Z",
          couponExpiresAt: "2026-10-31T15:00:00.001Z",
        }),
      ).ok,
    ).toBe(true);
  });

  it("利用開始が有効期限の 1 ミリ秒前なら受け付ける", () => {
    expect(
      toCampaignDraft(
        submission({
          couponExpiresAt: "2026-11-30T15:00:00.000Z",
          usableFrom: "2026-11-30T14:59:59.999Z",
        }),
      ).ok,
    ).toBe(true);
  });

  it("定率の値引きと、カテゴリに絞った範囲を契約の形で組む", () => {
    const reading = toCampaignDraft(
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

  it("過去の日時でも拒まない", () => {
    expect(
      toCampaignDraft(
        submission({
          startsAt: "2000-01-01T00:00:00.000Z",
          endsAt: "2000-02-01T00:00:00.000Z",
          couponExpiresAt: "2000-03-01T00:00:00.000Z",
          usableFrom: "2000-01-15T00:00:00.000Z",
        }),
      ).ok,
    ).toBe(true);
  });

  // ----- 異常系 -----
  it.each([
    { label: "7 文字", code: "ABCD-12" },
    { label: "33 文字", code: "A".repeat(33) },
    { label: "取れない文字を含む", code: "abcd_efgh" },
  ])("コードが$labelならコードの欄に文言を返す", ({ code }) => {
    expect(toCampaignDraft(submission({ code }))).toStrictEqual({
      ok: false,
      errors: { code: CAMPAIGN_CODE_INVALID_MESSAGE },
    });
  });

  it.each<{ field: string; overrides: Partial<CampaignOwnValues> }>([
    { field: "startsAt", overrides: { startsAt: "" } },
    { field: "endsAt", overrides: { endsAt: "" } },
    { field: "couponExpiresAt", overrides: { couponExpiresAt: "" } },
  ])("$field が空ならその欄に日時が無い文言を返す", ({ field, overrides }) => {
    expect(toCampaignDraft(submission(overrides))).toStrictEqual({
      ok: false,
      errors: { [field]: CAMPAIGN_DATE_MISSING_MESSAGE },
    });
  });

  it("利用開始が打たれていて読めなければ、日時が無い文言を返す", () => {
    expect(toCampaignDraft(submission({ usableFrom: "abc" }))).toStrictEqual({
      ok: false,
      errors: { usableFrom: CAMPAIGN_DATE_MISSING_MESSAGE },
    });
  });

  it.each([
    { label: "配布開始と同じ", endsAt: "2026-10-01T01:00:00.000Z" },
    { label: "配布開始より前", endsAt: "2026-09-30T00:00:00.000Z" },
  ])("配布終了が$labelなら、配布終了の欄だけに文言を返す", ({ endsAt }) => {
    expect(toCampaignDraft(submission({ endsAt }))).toStrictEqual({
      ok: false,
      errors: { endsAt: CAMPAIGN_ENDS_BEFORE_START_MESSAGE },
    });
  });

  it.each([
    { label: "配布終了と同じ", couponExpiresAt: "2026-10-31T15:00:00.000Z" },
    { label: "配布終了より前", couponExpiresAt: "2026-10-20T00:00:00.000Z" },
  ])("有効期限が$labelなら、有効期限の欄だけに文言を返す", ({ couponExpiresAt }) => {
    expect(toCampaignDraft(submission({ couponExpiresAt }))).toStrictEqual({
      ok: false,
      errors: { couponExpiresAt: CAMPAIGN_EXPIRES_BEFORE_END_MESSAGE },
    });
  });

  it.each([
    { label: "有効期限と同じ", usableFrom: "2026-11-30T15:00:00.000Z" },
    { label: "有効期限より後", usableFrom: "2026-12-01T00:00:00.000Z" },
  ])("利用開始が$labelなら、利用開始の欄だけに文言を返す", ({ usableFrom }) => {
    expect(toCampaignDraft(submission({ usableFrom }))).toStrictEqual({
      ok: false,
      errors: { usableFrom: CAMPAIGN_USABLE_AFTER_EXPIRY_MESSAGE },
    });
  });

  it("1 人あたりの上限が総枚数を超えれば、1 人あたりの上限の欄だけに文言を返す", () => {
    expect(toCampaignDraft(submission({ totalLimit: "2", perUserLimit: "3" }))).toStrictEqual({
      ok: false,
      errors: { perUserLimit: CAMPAIGN_PER_USER_OVER_TOTAL_MESSAGE },
    });
  });

  it.each([
    { label: "0", limit: "0" },
    { label: "負の数", limit: "-1" },
    { label: "小数", limit: "1.5" },
    { label: "空", limit: "" },
    { label: "指数表記", limit: "1e3" },
    { label: "安全な整数を超える数", limit: "9007199254740993" },
  ])("総枚数が$label（$limit）なら、総枚数の欄に文言を返す", ({ limit }) => {
    expect(toCampaignDraft(submission({ totalLimit: limit }))).toStrictEqual({
      ok: false,
      errors: { totalLimit: CAMPAIGN_LIMIT_INVALID_MESSAGE },
    });
  });

  it.each([
    { label: "0", limit: "0" },
    { label: "負の数", limit: "-1" },
    { label: "小数", limit: "1.5" },
    { label: "空", limit: "" },
    { label: "指数表記", limit: "1e3" },
    { label: "安全な整数を超える数", limit: "9007199254740993" },
  ])("1 人あたりの上限が$label（$limit）なら、その欄に文言を返す", ({ limit }) => {
    expect(toCampaignDraft(submission({ perUserLimit: limit }))).toStrictEqual({
      ok: false,
      errors: { perUserLimit: CAMPAIGN_LIMIT_INVALID_MESSAGE },
    });
  });

  it("総枚数が読めなければ、1 人あたりの上限との大小を比べない", () => {
    expect(toCampaignDraft(submission({ totalLimit: "abc", perUserLimit: "5" }))).toStrictEqual({
      ok: false,
      errors: { totalLimit: CAMPAIGN_LIMIT_INVALID_MESSAGE },
    });
  });

  it.each([
    { label: "0", amount: "0" },
    { label: "最小単位より細かい桁を持つ額", amount: "1.005" },
    { label: "数でない綴り", amount: "abc" },
  ])("最低購入額が$label（$amount）なら、最低購入額の欄に文言を返す", ({ amount }) => {
    expect(toCampaignDraft(submission({ minPurchaseAmount: amount }))).toStrictEqual({
      ok: false,
      errors: { minPurchaseAmount: CAMPAIGN_MIN_PURCHASE_INVALID_MESSAGE },
    });
  });

  it("配布開始が無ければ、配布終了との前後を比べない", () => {
    expect(
      toCampaignDraft(submission({ startsAt: "", endsAt: "2026-09-01T00:00:00.000Z" })),
    ).toStrictEqual({
      ok: false,
      errors: { startsAt: CAMPAIGN_DATE_MISSING_MESSAGE },
    });
  });

  it("配布終了が無ければ、有効期限との前後を比べない", () => {
    expect(
      toCampaignDraft(
        submission({ endsAt: "", couponExpiresAt: "2026-09-01T00:00:00.000Z", usableFrom: "" }),
      ),
    ).toStrictEqual({
      ok: false,
      errors: { endsAt: CAMPAIGN_DATE_MISSING_MESSAGE },
    });
  });

  it("有効期限が無ければ、利用開始との前後を比べない", () => {
    expect(
      toCampaignDraft(submission({ couponExpiresAt: "", usableFrom: "2027-01-01T00:00:00.000Z" })),
    ).toStrictEqual({
      ok: false,
      errors: { couponExpiresAt: CAMPAIGN_DATE_MISSING_MESSAGE },
    });
  });

  it("何も打っていなければ、必須の欄すべてに文言を返す", () => {
    expect(
      toCampaignDraft({
        own: EMPTY_CAMPAIGN_OWN_VALUES,
        discount: EMPTY_COUPON_DISCOUNT_VALUES,
        scope: EMPTY_COUPON_SCOPE_VALUES,
      }),
    ).toStrictEqual({
      ok: false,
      errors: {
        code: CAMPAIGN_CODE_INVALID_MESSAGE,
        discountKind: COUPON_DISCOUNT_KIND_MISSING_MESSAGE,
        scopeKind: COUPON_SCOPE_KIND_MISSING_MESSAGE,
        startsAt: CAMPAIGN_DATE_MISSING_MESSAGE,
        endsAt: CAMPAIGN_DATE_MISSING_MESSAGE,
        couponExpiresAt: CAMPAIGN_DATE_MISSING_MESSAGE,
        totalLimit: CAMPAIGN_LIMIT_INVALID_MESSAGE,
        perUserLimit: CAMPAIGN_LIMIT_INVALID_MESSAGE,
      },
    });
  });

  it("値引きだけが読めなければ、値引きの欄の文言をそのまま返す", () => {
    expect(
      toCampaignDraft(submission({}, { kind: "flat", value: "0", maxAmount: "" })),
    ).toStrictEqual({
      ok: false,
      errors: { discountValue: COUPON_DISCOUNT_FLAT_INVALID_MESSAGE },
    });
  });

  it("範囲だけが読めなければ、範囲の欄の文言をそのまま返す", () => {
    expect(
      toCampaignDraft(
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

  it("値引きと範囲とキャンペーン自身の誤りを 1 つの文言の一覧へまとめる", () => {
    expect(
      toCampaignDraft(
        submission(
          { code: "short" },
          { kind: "flat", value: "0", maxAmount: "" },
          { kind: "category", categoryId: "", productId: "", productName: "" },
        ),
      ),
    ).toStrictEqual({
      ok: false,
      errors: {
        code: CAMPAIGN_CODE_INVALID_MESSAGE,
        discountValue: COUPON_DISCOUNT_FLAT_INVALID_MESSAGE,
        scopeCategoryId: COUPON_SCOPE_CATEGORY_MISSING_MESSAGE,
      },
    });
  });
});
