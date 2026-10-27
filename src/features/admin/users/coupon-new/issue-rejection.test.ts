import { describe, expect, it, vi } from "vitest";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { withErrorDetails } from "@/errors/error-meta";
import { failedActionState } from "@/model/action-state";
import type { CouponScopeTarget } from "@/model/coupon/coupon";
import { toProductCategoryId, toProductId } from "@/model/product/product";

import {
  ISSUE_FIELD_LABELS,
  ISSUE_RECIPIENT_LOST_MESSAGE,
  ISSUE_SCOPE_CATEGORY_LOST_MESSAGE,
  ISSUE_SCOPE_PRODUCT_LOST_MESSAGE,
  ISSUE_TARGET_UNKNOWN_MESSAGE,
  type IssueCouponState,
} from "./form-state";
import { notFoundStateOf, type RecipientReread, toIssueFieldErrors } from "./issue-rejection";

const CATEGORY_SCOPE: CouponScopeTarget = {
  kind: "category",
  categoryId: toProductCategoryId("0195f0c2-0000-7000-8000-000000000011"),
};

const PRODUCT_SCOPE: CouponScopeTarget = {
  kind: "product",
  productId: toProductId("0195f0c2-0000-7000-8000-000000000021"),
};

const RECIPIENT_LOST: IssueCouponState = failedActionState({
  formError: null,
  fieldErrors: { userId: [ISSUE_RECIPIENT_LOST_MESSAGE] },
  kind: ErrorKind.NOT_FOUND,
});

function rejectionOf(kind: ErrorKind, details: readonly string[]): Error {
  return createAppError(kind, {
    cause: withErrorDetails(new Error("クーポンの発行が失敗しました"), details),
  });
}

function rereadOf(result: RecipientReread) {
  return vi.fn(async () => result);
}

describe("toIssueFieldErrors", () => {
  // ----- 正常系 -----
  it.each(Object.entries(ISSUE_FIELD_LABELS).map(([name, label]) => ({ name, label })))(
    "$name が名指しされたら、$label を主語にした文言を置く",
    ({ name, label }) => {
      expect(toIssueFieldErrors(rejectionOf(ErrorKind.VALIDATION, [name]))).toStrictEqual({
        [name]: [`${label}は受け付けられませんでした。入力し直してください。`],
      });
    },
  );

  it("複数が名指しされたら、それぞれの欄へ文言を置く", () => {
    expect(
      toIssueFieldErrors(rejectionOf(ErrorKind.VALIDATION, ["expiresAt", "minPurchaseAmount"])),
    ).toStrictEqual({
      expiresAt: ["有効期限は受け付けられませんでした。入力し直してください。"],
      minPurchaseAmount: ["最低購入額は受け付けられませんでした。入力し直してください。"],
    });
  });

  // ----- 異常系 -----
  it("宛先と値引きと範囲の項目名は、この画面の名指しとして読まない", () => {
    expect(
      toIssueFieldErrors(
        rejectionOf(ErrorKind.VALIDATION, [
          "userId",
          "discountKind",
          "discountValue",
          "scopeKind",
          "scopeCategoryId",
        ]),
      ),
    ).toStrictEqual({});
  });

  it("継承した性質の名前も入力欄として読まない", () => {
    expect(
      toIssueFieldErrors(rejectionOf(ErrorKind.VALIDATION, ["toString", "constructor"])),
    ).toStrictEqual({});
  });

  it("読める名前だけを残し、読めない名前が混ざっても落とさない", () => {
    expect(
      toIssueFieldErrors(rejectionOf(ErrorKind.VALIDATION, ["discountValue", "usableFrom"])),
    ).toStrictEqual({
      usableFrom: ["利用開始は受け付けられませんでした。入力し直してください。"],
    });
  });

  it("名指しの無い検証の失敗では何も置かない", () => {
    expect(toIssueFieldErrors(createAppError(ErrorKind.VALIDATION))).toStrictEqual({});
  });

  it.each([
    { label: "分類の付いていないエラー", error: new Error("素の失敗") },
    { label: "文字列", error: "失敗" },
    { label: "undefined", error: undefined },
  ])("$labelでは何も置かない", ({ error }) => {
    expect(toIssueFieldErrors(error)).toStrictEqual({});
  });
});

describe("notFoundStateOf", () => {
  // ----- 正常系 -----
  it("範囲が全体なら、宛先を読み直さずに宛先を失った失敗を返す", async () => {
    const reread = rereadOf({ kind: "found", deletedAt: null });

    expect(await notFoundStateOf({ kind: "all" }, reread)).toStrictEqual(RECIPIENT_LOST);
    expect(reread).not.toHaveBeenCalled();
  });

  it("カテゴリに絞っていて宛先が在籍していれば、カテゴリの欄だけに見つからない文言を返す", async () => {
    expect(
      await notFoundStateOf(CATEGORY_SCOPE, rereadOf({ kind: "found", deletedAt: null })),
    ).toStrictEqual(
      failedActionState({
        formError: null,
        fieldErrors: { scopeCategoryId: [ISSUE_SCOPE_CATEGORY_LOST_MESSAGE] },
        kind: ErrorKind.NOT_FOUND,
      }),
    );
  });

  it("商品に絞っていて宛先が在籍していれば、商品の欄だけに見つからない文言を返す", async () => {
    expect(
      await notFoundStateOf(PRODUCT_SCOPE, rereadOf({ kind: "found", deletedAt: null })),
    ).toStrictEqual(
      failedActionState({
        formError: null,
        fieldErrors: { scopeProductId: [ISSUE_SCOPE_PRODUCT_LOST_MESSAGE] },
        kind: ErrorKind.NOT_FOUND,
      }),
    );
  });

  it("読み直した宛先が退会していれば、宛先を失った失敗を返す", async () => {
    expect(
      await notFoundStateOf(
        CATEGORY_SCOPE,
        rereadOf({ kind: "found", deletedAt: "2026-10-01T00:00:00.000Z" }),
      ),
    ).toStrictEqual(RECIPIENT_LOST);
  });

  it("読み直した宛先が見つからなければ、宛先を失った失敗を返す", async () => {
    expect(await notFoundStateOf(PRODUCT_SCOPE, rereadOf({ kind: "absent" }))).toStrictEqual(
      RECIPIENT_LOST,
    );
  });

  // ----- 異常系 -----
  it("宛先を読み直せなければ、欄に紐づけずにどちらとも読める全体の文言を返す", async () => {
    expect(await notFoundStateOf(CATEGORY_SCOPE, rereadOf({ kind: "unreadable" }))).toStrictEqual(
      failedActionState({ formError: ISSUE_TARGET_UNKNOWN_MESSAGE, kind: ErrorKind.NOT_FOUND }),
    );
  });
});
