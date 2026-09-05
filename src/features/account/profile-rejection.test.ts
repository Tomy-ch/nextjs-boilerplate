import { describe, expect, it } from "vitest";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { withErrorDetails } from "@/errors/error-meta";

import { toProfileFieldErrors } from "./profile-rejection";

/** 接続先が項目を名指しして弾いた失敗を組む。 */
function rejectionOf(details: readonly string[]): Error {
  return createAppError(ErrorKind.VALIDATION, {
    cause: withErrorDetails(new Error("PUT /v1/users/{userId} が失敗しました"), details),
  });
}

describe("toProfileFieldErrors", () => {
  // ----- 正常系 -----
  it("名指しされた入力欄に、その項目名を主語にした文言を置く", () => {
    expect(toProfileFieldErrors(rejectionOf(["email"]))).toEqual({
      email: ["メールアドレスは受け付けられませんでした。入力し直してください。"],
    });
  });

  it("複数の入力欄が名指しされたら、そのすべてに文言を置く", () => {
    const fieldErrors = toProfileFieldErrors(rejectionOf(["firstName", "postalCode"]));

    expect(Object.keys(fieldErrors)).toEqual(["firstName", "postalCode"]);
  });

  // ----- 異常系 -----
  it("この画面の入力欄として読めない名前は鍵にしない", () => {
    expect(toProfileFieldErrors(rejectionOf(["role"]))).toEqual({});
  });

  it("読める名前だけを残し、読めない名前が混ざっても落とさない", () => {
    expect(toProfileFieldErrors(rejectionOf(["role", "city"]))).toEqual({
      city: ["市区町村は受け付けられませんでした。入力し直してください。"],
    });
  });

  it("名指しの無い検証の失敗では何も置かない", () => {
    expect(toProfileFieldErrors(createAppError(ErrorKind.VALIDATION))).toEqual({});
  });

  it("検証以外の分類は、項目に紐づく失敗として扱わない", () => {
    expect(
      toProfileFieldErrors(
        createAppError(ErrorKind.CONFLICT, {
          cause: withErrorDetails(new Error("競合しました"), ["email"]),
        }),
      ),
    ).toEqual({});
  });

  it("分類の付いていない値では何も置かない", () => {
    expect(toProfileFieldErrors(new Error("素の失敗"))).toEqual({});
  });
});
