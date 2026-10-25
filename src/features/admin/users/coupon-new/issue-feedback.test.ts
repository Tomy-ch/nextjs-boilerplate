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
import { closesConfirmation, failuresOf, fieldMessagesOf, recipientLostIn } from "./issue-feedback";

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

describe("failuresOf", () => {
  // ----- 正常系 -----
  it("全体の文言だけの失敗なら、その文言を返す", () => {
    expect(failuresOf(failed({ formError: "全体の文言" }))).toEqual(["全体の文言"]);
  });

  it("欄の誤りがある失敗では、欄の側に出るため何も返さない", () => {
    expect(
      failuresOf(failed({ formError: "全体の文言", fieldErrors: { expiresAt: ["期限の文言"] } })),
    ).toEqual([]);
  });

  it("全体の文言が無い失敗では何も返さない", () => {
    expect(failuresOf(failed({ formError: null }))).toEqual([]);
  });

  it("成功なら何も返さない", () => {
    expect(failuresOf(succeeded)).toEqual([]);
  });

  it("まだ結果が無ければ何も返さない", () => {
    expect(failuresOf(idle)).toEqual([]);
  });
});

describe("fieldMessagesOf", () => {
  // ----- 正常系 -----
  it("結果が下げられていれば、送る前の判定をそのまま返す", () => {
    expect(fieldMessagesOf({ expiresAt: "判定の文言" }, null)).toStrictEqual({
      expiresAt: "判定の文言",
    });
  });

  it("送る前の判定が無い欄には、送り返された先頭の文言を添える", () => {
    expect(
      fieldMessagesOf(
        {},
        failed({
          formError: null,
          fieldErrors: { scopeCategoryId: ["結果の文言 1", "結果の文言 2"] },
        }),
      ),
    ).toStrictEqual({ scopeCategoryId: "結果の文言 1" });
  });

  it("同じ欄に両方あれば、送る前の判定を優先する", () => {
    expect(
      fieldMessagesOf(
        { minPurchaseAmount: "判定の文言" },
        failed({ formError: null, fieldErrors: { minPurchaseAmount: ["結果の文言"] } }),
      ),
    ).toStrictEqual({ minPurchaseAmount: "判定の文言" });
  });

  it("欄ごとに別の出どころから選ぶ", () => {
    expect(
      fieldMessagesOf(
        { expiresAt: "判定の文言" },
        failed({ formError: null, fieldErrors: { usableFrom: ["結果の文言"] } }),
      ),
    ).toStrictEqual({ expiresAt: "判定の文言", usableFrom: "結果の文言" });
  });

  it("成功の結果からは文言を拾わず、送る前の判定だけを見る", () => {
    expect(fieldMessagesOf({ expiresAt: "判定の文言" }, succeeded)).toStrictEqual({
      expiresAt: "判定の文言",
    });
  });

  it("まだ結果が無ければ、送る前の判定だけを見る", () => {
    expect(fieldMessagesOf({}, idle)).toStrictEqual({});
  });

  it("欄の誤りを持たない失敗からは文言を拾わない", () => {
    expect(fieldMessagesOf({}, failed({ formError: "全体の文言" }))).toStrictEqual({});
  });

  it("空の一覧と中身の無い欄は飛ばす", () => {
    expect(
      fieldMessagesOf(
        {},
        failed({ formError: null, fieldErrors: { expiresAt: [], usableFrom: undefined } }),
      ),
    ).toStrictEqual({});
  });
});
