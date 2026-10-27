import { describe, expect, it } from "vitest";

import { ErrorKind } from "@/errors/error-kind";
import { type FieldErrors, failedActionState, idleActionState } from "@/model/action-state";

import { closesConfirmation, resendResultOf } from "./campaign-feedback";
import {
  CAMPAIGN_CODE_CONFLICT_MESSAGE,
  CAMPAIGN_RESEND_CONFLICT_MESSAGE,
  type CreateCampaignField,
  type CreateCampaignState,
} from "./form-state";

const idle: CreateCampaignState = idleActionState();

/** この画面の失敗の結果を組む。 */
function failed(options: {
  formError?: string | null;
  fieldErrors?: FieldErrors<CreateCampaignField>;
  kind?: ErrorKind;
}): CreateCampaignState {
  return failedActionState<never, CreateCampaignField>(options);
}

describe("resendResultOf", () => {
  // ----- 正常系 -----
  it("409 はコードの欄から外し、どちらとも読める全体の文言だけを持つ失敗に読み替える", () => {
    const conflicted: CreateCampaignState = failedActionState({
      formError: null,
      fieldErrors: { code: ["重複"] },
      kind: ErrorKind.CONFLICT,
    });

    expect(resendResultOf(conflicted)).toStrictEqual(
      failedActionState({ formError: CAMPAIGN_RESEND_CONFLICT_MESSAGE, kind: ErrorKind.CONFLICT }),
    );
  });

  it("409 でない失敗は読み替えずにそのまま返す", () => {
    const rejected: CreateCampaignState = failedActionState({
      formError: "拒否",
      kind: ErrorKind.VALIDATION,
    });

    expect(resendResultOf(rejected)).toBe(rejected);
  });

  it("失敗でない結果はそのまま返す", () => {
    expect(resendResultOf(idle)).toBe(idle);
  });
});

describe("closesConfirmation", () => {
  // ----- 正常系 -----
  it("欄の誤りが返ったら閉じる", () => {
    expect(
      closesConfirmation(failed({ formError: null, fieldErrors: { totalLimit: ["枚数の文言"] } })),
    ).toBe(true);
  });

  it("コードの重複で拒まれたら、コードの欄へ戻すため閉じる", () => {
    expect(
      closesConfirmation(
        failed({
          formError: null,
          fieldErrors: { code: [CAMPAIGN_CODE_CONFLICT_MESSAGE] },
          kind: ErrorKind.CONFLICT,
        }),
      ),
    ).toBe(true);
  });

  it("全体の文言だけの失敗では閉じない", () => {
    expect(closesConfirmation(failed({ formError: "混雑", kind: ErrorKind.UNAVAILABLE }))).toBe(
      false,
    );
  });

  it("欄の誤りが空の一覧なら閉じない", () => {
    expect(closesConfirmation(failed({ formError: "失敗", fieldErrors: {} }))).toBe(false);
  });

  it("まだ結果が無ければ閉じない", () => {
    expect(closesConfirmation(idle)).toBe(false);
  });
});
