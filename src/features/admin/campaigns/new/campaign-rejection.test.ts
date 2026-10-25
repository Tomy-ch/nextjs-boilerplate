import { describe, expect, it } from "vitest";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { withErrorDetails } from "@/errors/error-meta";

import { toCampaignFieldErrors } from "./campaign-rejection";
import { CAMPAIGN_CODE_CONFLICT_MESSAGE, CAMPAIGN_FIELD_LABELS } from "./form-state";

/** 接続先が項目を名指しして弾いた失敗を組む。 */
function rejectionOf(kind: ErrorKind, details: readonly string[]): Error {
  return createAppError(kind, {
    cause: withErrorDetails(new Error("キャンペーンの送信が失敗しました"), details),
  });
}

describe("toCampaignFieldErrors", () => {
  // ----- 正常系 -----
  it("コードの重複で拒まれたら、コードの欄だけに重複の文言を置く", () => {
    expect(toCampaignFieldErrors(rejectionOf(ErrorKind.CONFLICT, ["startsAt"]))).toStrictEqual({
      code: [CAMPAIGN_CODE_CONFLICT_MESSAGE],
    });
  });

  it("配布開始が名指しされたら、その欄に項目名を主語にした文言を置く", () => {
    expect(toCampaignFieldErrors(rejectionOf(ErrorKind.VALIDATION, ["startsAt"]))).toStrictEqual({
      startsAt: ["配布開始は受け付けられませんでした。入力し直してください。"],
    });
  });

  it("複数が名指しされたら、名指しされた順にそれぞれの欄へ文言を置く", () => {
    const fieldErrors = toCampaignFieldErrors(
      rejectionOf(ErrorKind.VALIDATION, ["perUserLimit", "code"]),
    );

    expect(Object.keys(fieldErrors)).toEqual(["perUserLimit", "code"]);
  });

  it.each(Object.entries(CAMPAIGN_FIELD_LABELS).map(([name, label]) => ({ name, label })))(
    "$name が名指しされたら、$label を主語にした文言を置く",
    ({ name, label }) => {
      expect(toCampaignFieldErrors(rejectionOf(ErrorKind.VALIDATION, [name]))).toStrictEqual({
        [name]: [`${label}は受け付けられませんでした。入力し直してください。`],
      });
    },
  );

  // ----- 異常系 -----
  it("値引きと範囲の項目名は、この画面の名指しとして読まない", () => {
    expect(
      toCampaignFieldErrors(
        rejectionOf(ErrorKind.VALIDATION, ["discountKind", "discountValue", "scopeKind"]),
      ),
    ).toStrictEqual({});
  });

  it("継承した性質の名前も入力欄として読まない", () => {
    expect(
      toCampaignFieldErrors(rejectionOf(ErrorKind.VALIDATION, ["toString", "constructor"])),
    ).toStrictEqual({});
  });

  it("読める名前だけを残し、読めない名前が混ざっても落とさない", () => {
    expect(
      toCampaignFieldErrors(rejectionOf(ErrorKind.VALIDATION, ["discountValue", "totalLimit"])),
    ).toStrictEqual({
      totalLimit: ["総枚数の上限は受け付けられませんでした。入力し直してください。"],
    });
  });

  it("名指しの無い検証の失敗では何も置かない", () => {
    expect(toCampaignFieldErrors(createAppError(ErrorKind.VALIDATION))).toStrictEqual({});
  });

  it("重複と検証以外の分類は、名指しがあっても欄に紐づけない", () => {
    expect(toCampaignFieldErrors(rejectionOf(ErrorKind.UNAVAILABLE, ["code"]))).toStrictEqual({});
  });

  it.each([
    { label: "分類の付いていないエラー", error: new Error("素の失敗") },
    { label: "文字列", error: "失敗" },
    { label: "undefined", error: undefined },
  ])("$labelでは何も置かない", ({ error }) => {
    expect(toCampaignFieldErrors(error)).toStrictEqual({});
  });
});
