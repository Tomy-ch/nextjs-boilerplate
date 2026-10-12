import { describe, expect, it } from "vitest";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { withErrorDetails } from "@/errors/error-meta";

import { toDiscontinueFieldErrors } from "./discontinue-rejection";

/** 接続先が項目を名指しして弾いた失敗を組む。 */
function rejectionOf(details: readonly string[]): Error {
  return createAppError(ErrorKind.VALIDATION, {
    cause: withErrorDetails(new Error("廃番の送信が失敗しました"), details),
  });
}

describe("toDiscontinueFieldErrors", () => {
  // ----- 正常系 -----
  it("値引き率が名指しされたら、その欄に項目名を主語にした文言を置く", () => {
    expect(toDiscontinueFieldErrors(rejectionOf(["couponDiscountRate"]))).toEqual({
      couponDiscountRate: ["値引き率は受け付けられませんでした。入力し直してください。"],
    });
  });

  it("有効日数が名指しされたら、その欄に項目名を主語にした文言を置く", () => {
    expect(toDiscontinueFieldErrors(rejectionOf(["couponValidityDays"]))).toEqual({
      couponValidityDays: ["有効日数は受け付けられませんでした。入力し直してください。"],
    });
  });

  it("両方が名指しされたら、両方の欄に文言を置く", () => {
    const fieldErrors = toDiscontinueFieldErrors(
      rejectionOf(["couponDiscountRate", "couponValidityDays"]),
    );

    expect(Object.keys(fieldErrors)).toEqual(["couponDiscountRate", "couponValidityDays"]);
  });

  // ----- 異常系 -----
  it("この画面の入力欄として読めない名前は鍵にしない", () => {
    expect(toDiscontinueFieldErrors(rejectionOf(["productId"]))).toEqual({});
  });

  it("継承した性質の名前も入力欄として読まない", () => {
    expect(toDiscontinueFieldErrors(rejectionOf(["toString", "constructor"]))).toEqual({});
  });

  it("読める名前だけを残し、読めない名前が混ざっても落とさない", () => {
    expect(toDiscontinueFieldErrors(rejectionOf(["productId", "couponValidityDays"]))).toEqual({
      couponValidityDays: ["有効日数は受け付けられませんでした。入力し直してください。"],
    });
  });

  it("名指しの無い検証の失敗では何も置かない", () => {
    expect(toDiscontinueFieldErrors(createAppError(ErrorKind.VALIDATION))).toEqual({});
  });

  it("検証以外の分類は、名指しがあっても項目に紐づく失敗として扱わない", () => {
    expect(
      toDiscontinueFieldErrors(
        createAppError(ErrorKind.CONFLICT, {
          cause: withErrorDetails(new Error("競合しました"), ["couponDiscountRate"]),
        }),
      ),
    ).toEqual({});
  });

  it("分類の付いていない値では何も置かない", () => {
    expect(toDiscontinueFieldErrors(new Error("素の失敗"))).toEqual({});
  });
});
