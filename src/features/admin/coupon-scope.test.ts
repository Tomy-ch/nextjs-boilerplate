import { describe, expect, it } from "vitest";

import {
  COUPON_SCOPE_CATEGORY_MISSING_MESSAGE,
  COUPON_SCOPE_FORM_NAMES,
  COUPON_SCOPE_KIND_MISSING_MESSAGE,
  COUPON_SCOPE_PRODUCT_MISSING_MESSAGE,
  type CouponScopeValues,
  readCouponScopeValues,
  toCouponScope,
} from "./coupon-scope";

const CATEGORY_ID = "0195f0c2-0000-7000-8000-000000000011";
const PRODUCT_ID = "0195f0c2-0000-7000-8000-000000000021";

/** 選ばれている範囲を組む。渡した項目だけを差し替える。 */
function values(overrides: Partial<CouponScopeValues>): CouponScopeValues {
  return { kind: "", categoryId: "", productId: "", productName: "", ...overrides };
}

/** 送信の 1 件を組む。渡さなかった項目は届かない。 */
function formData(
  entries: Readonly<Partial<Record<"kind" | "categoryId" | "productId", string>>>,
): FormData {
  const data = new FormData();

  if (entries.kind !== undefined) data.append(COUPON_SCOPE_FORM_NAMES.kind, entries.kind);
  if (entries.categoryId !== undefined) {
    data.append(COUPON_SCOPE_FORM_NAMES.categoryId, entries.categoryId);
  }
  if (entries.productId !== undefined) {
    data.append(COUPON_SCOPE_FORM_NAMES.productId, entries.productId);
  }

  return data;
}

describe("toCouponScope", () => {
  // ----- 正常系 -----
  it("全体を選べば、対象の識別子を見ずに全体の範囲として読む", () => {
    expect(
      toCouponScope(values({ kind: "all", categoryId: CATEGORY_ID, productId: "not-a-uuid" })),
    ).toStrictEqual({ ok: true, scope: { kind: "all" } });
  });

  it("カテゴリを選べば、カテゴリの識別子だけを持つ範囲として読む", () => {
    expect(
      toCouponScope(values({ kind: "category", categoryId: CATEGORY_ID, productId: PRODUCT_ID })),
    ).toStrictEqual({ ok: true, scope: { kind: "category", categoryId: CATEGORY_ID } });
  });

  it("商品を選べば、商品の識別子だけを持つ範囲として読む", () => {
    expect(
      toCouponScope(values({ kind: "product", categoryId: CATEGORY_ID, productId: PRODUCT_ID })),
    ).toStrictEqual({ ok: true, scope: { kind: "product", productId: PRODUCT_ID } });
  });

  it("カテゴリを選んでいれば、商品の識別子が読めなくても拒まない", () => {
    expect(
      toCouponScope(values({ kind: "category", categoryId: CATEGORY_ID, productId: "bad" })).ok,
    ).toBe(true);
  });

  it("商品を選んでいれば、カテゴリの識別子が読めなくても拒まない", () => {
    expect(
      toCouponScope(values({ kind: "product", categoryId: "bad", productId: PRODUCT_ID })).ok,
    ).toBe(true);
  });

  // ----- 異常系 -----
  it("種別が選ばれていなければ、種別の欄だけに文言を返す", () => {
    expect(toCouponScope(values({ categoryId: CATEGORY_ID, productId: PRODUCT_ID }))).toStrictEqual(
      { ok: false, errors: { scopeKind: COUPON_SCOPE_KIND_MISSING_MESSAGE } },
    );
  });

  it.each([
    { label: "空", categoryId: "" },
    { label: "UUID でない", categoryId: "not-a-uuid" },
  ])("カテゴリの識別子が$labelなら、カテゴリの欄に文言を返す", ({ categoryId }) => {
    expect(toCouponScope(values({ kind: "category", categoryId }))).toStrictEqual({
      ok: false,
      errors: { scopeCategoryId: COUPON_SCOPE_CATEGORY_MISSING_MESSAGE },
    });
  });

  it.each([
    { label: "空", productId: "" },
    { label: "UUID でない", productId: "not-a-uuid" },
  ])("商品の識別子が$labelなら、商品の欄に文言を返す", ({ productId }) => {
    expect(toCouponScope(values({ kind: "product", productId }))).toStrictEqual({
      ok: false,
      errors: { scopeProductId: COUPON_SCOPE_PRODUCT_MISSING_MESSAGE },
    });
  });
});

describe("readCouponScopeValues", () => {
  // ----- 正常系 -----
  it.each([{ kind: "all" }, { kind: "category" }, { kind: "product" }] as const)(
    "種別 $kind を読む",
    ({ kind }) => {
      expect(readCouponScopeValues(formData({ kind })).kind).toBe(kind);
    },
  );

  it("対象の識別子は届いたまま読み、商品の名前は常に空にする", () => {
    expect(
      readCouponScopeValues(
        formData({ kind: "product", categoryId: CATEGORY_ID, productId: PRODUCT_ID }),
      ),
    ).toStrictEqual({
      kind: "product",
      categoryId: CATEGORY_ID,
      productId: PRODUCT_ID,
      productName: "",
    });
  });

  it("何も届かなければ、すべて空として読む", () => {
    expect(readCouponScopeValues(new FormData())).toStrictEqual({
      kind: "",
      categoryId: "",
      productId: "",
      productName: "",
    });
  });

  // ----- 異常系 -----
  it.each([
    { label: "知らない綴り", kind: "bogus" },
    { label: "大文字の綴り", kind: "ALL" },
  ])("種別が$label（$kind）なら空として読む", ({ kind }) => {
    expect(readCouponScopeValues(formData({ kind })).kind).toBe("");
  });

  it("ファイルで届いた値は空として読む", () => {
    const data = new FormData();

    data.append(COUPON_SCOPE_FORM_NAMES.kind, new File(["all"], "kind.txt"));
    data.append(COUPON_SCOPE_FORM_NAMES.categoryId, new File([CATEGORY_ID], "id.txt"));

    expect(readCouponScopeValues(data)).toStrictEqual({
      kind: "",
      categoryId: "",
      productId: "",
      productName: "",
    });
  });
});
