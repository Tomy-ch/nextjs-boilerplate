import { describe, expect, it } from "vitest";

import { ErrorKind } from "@/errors/error-kind";
import {
  type FieldErrors,
  failedActionState,
  idleActionState,
  succeededActionState,
} from "@/model/action-state";

import {
  ISSUE_RECIPIENT_LOST_MESSAGE,
  ISSUE_SCOPE_CATEGORY_LOST_MESSAGE,
  type IssueCouponField,
  type IssueCouponState,
} from "./form-state";
import { closesConfirmation, recipientLostIn } from "./issue-feedback";

const idle: IssueCouponState = idleActionState();

const succeeded: IssueCouponState = succeededActionState(undefined);

function failed(options: {
  formError?: string | null;
  fieldErrors?: FieldErrors<IssueCouponField>;
  kind?: ErrorKind;
}): IssueCouponState {
  return failedActionState<void, IssueCouponField>(options);
}

describe("recipientLostIn", () => {
  // ----- 正常系 -----
  it("宛先の欄に誤りが返った失敗なら、宛先を失ったと読む", () => {
    expect(
      recipientLostIn(
        failed({
          formError: null,
          fieldErrors: { userId: [ISSUE_RECIPIENT_LOST_MESSAGE] },
          kind: ErrorKind.NOT_FOUND,
        }),
      ),
    ).toBe(true);
  });

  it("範囲の欄だけに誤りが返った失敗なら、宛先を失ったと読まない", () => {
    expect(
      recipientLostIn(
        failed({
          formError: null,
          fieldErrors: { scopeCategoryId: [ISSUE_SCOPE_CATEGORY_LOST_MESSAGE] },
          kind: ErrorKind.NOT_FOUND,
        }),
      ),
    ).toBe(false);
  });

  it("全体の文言だけの失敗なら、宛先を失ったと読まない", () => {
    expect(recipientLostIn(failed({ formError: "全体の文言" }))).toBe(false);
  });

  it("成功なら、宛先を失ったと読まない", () => {
    expect(recipientLostIn(succeeded)).toBe(false);
  });

  it("まだ結果が無ければ、宛先を失ったと読まない", () => {
    expect(recipientLostIn(idle)).toBe(false);
  });
});

describe("closesConfirmation", () => {
  // ----- 正常系 -----
  it("成功したら閉じる", () => {
    expect(closesConfirmation(succeeded)).toBe(true);
  });

  it("欄の誤りが返ったら閉じる", () => {
    expect(
      closesConfirmation(failed({ formError: null, fieldErrors: { expiresAt: ["期限の文言"] } })),
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
