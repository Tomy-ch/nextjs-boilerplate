import { describe, expect, it } from "vitest";

import { ErrorKind } from "@/errors/error-kind";
import {
  type FieldErrors,
  failedActionState,
  idleActionState,
  succeededActionState,
} from "@/model/action-state";
import type { ProductDiscontinueResult } from "@/model/product/product";

import {
  COUPON_DISCOUNT_RATE_INVALID_MESSAGE,
  COUPON_VALIDITY_DAYS_INVALID_MESSAGE,
} from "./coupon-rules";
import {
  checkConditions,
  closesConfirmation,
  failuresOf,
  fieldMessagesOf,
} from "./discontinue-feedback";
import type { DiscontinueProductField, DiscontinueProductState } from "./form-state";

const idle: DiscontinueProductState = idleActionState();
const succeeded: DiscontinueProductState = succeededActionState({
  discontinuedAt: "2026-08-14T10:30:00.000Z",
  affectedCartCount: 43,
  affectedUserCount: 38,
  issuedCouponCount: 38,
});

/** この画面の失敗の結果を組む。 */
function failed(options: {
  formError?: string | null;
  fieldErrors?: FieldErrors<DiscontinueProductField>;
  kind?: ErrorKind;
}): DiscontinueProductState {
  return failedActionState<ProductDiscontinueResult, DiscontinueProductField>(options);
}

describe("checkConditions", () => {
  // ----- 正常系 -----
  it("両方とも読めれば何も返さない", () => {
    expect(checkConditions({ couponDiscountRate: "10", couponValidityDays: "30" })).toEqual({});
  });

  // ----- 異常系 -----
  it("値引き率だけが読めなければ、その欄だけに文言を返す", () => {
    expect(checkConditions({ couponDiscountRate: "10%", couponValidityDays: "30" })).toStrictEqual({
      couponDiscountRate: COUPON_DISCOUNT_RATE_INVALID_MESSAGE,
    });
  });

  it("有効日数だけが読めなければ、その欄だけに文言を返す", () => {
    expect(checkConditions({ couponDiscountRate: "10", couponValidityDays: "0" })).toStrictEqual({
      couponValidityDays: COUPON_VALIDITY_DAYS_INVALID_MESSAGE,
    });
  });

  it("何も打っていなければ、両方の欄に文言を返す", () => {
    expect(checkConditions({ couponDiscountRate: "", couponValidityDays: "" })).toEqual({
      couponDiscountRate: COUPON_DISCOUNT_RATE_INVALID_MESSAGE,
      couponValidityDays: COUPON_VALIDITY_DAYS_INVALID_MESSAGE,
    });
  });
});

describe("closesConfirmation", () => {
  // ----- 正常系 -----
  it("成立したら閉じる", () => {
    expect(closesConfirmation(succeeded)).toBe(true);
  });

  it("進行中の購入が残って拒まれたら閉じる", () => {
    expect(closesConfirmation(failed({ formError: "拒否", kind: ErrorKind.CONFLICT }))).toBe(true);
  });

  it("項目の誤りで拒まれたら閉じない", () => {
    expect(closesConfirmation(failed({ formError: null, kind: ErrorKind.VALIDATION }))).toBe(false);
  });

  it("一時的に受け付けられなかったら閉じない", () => {
    expect(closesConfirmation(failed({ formError: "混雑", kind: ErrorKind.UNAVAILABLE }))).toBe(
      false,
    );
  });

  it("分類の無い失敗では閉じない", () => {
    expect(closesConfirmation(failed({ formError: "失敗" }))).toBe(false);
  });

  it("まだ結果が無ければ閉じない", () => {
    expect(closesConfirmation(idle)).toBe(false);
  });
});

describe("failuresOf", () => {
  // ----- 正常系 -----
  it("全体の文言を先に、項目ごとの文言を後に並べる", () => {
    expect(
      failuresOf(
        failed({
          formError: "全体の文言",
          fieldErrors: {
            couponDiscountRate: ["率の文言 1", "率の文言 2"],
            couponValidityDays: ["日数の文言"],
          },
        }),
      ),
    ).toEqual(["全体の文言", "率の文言 1", "率の文言 2", "日数の文言"]);
  });

  it("全体の文言が無ければ、項目ごとの文言だけを並べる", () => {
    expect(
      failuresOf(failed({ formError: null, fieldErrors: { couponValidityDays: ["日数の文言"] } })),
    ).toEqual(["日数の文言"]);
  });

  it("項目ごとの文言が無ければ、全体の文言だけを返す", () => {
    expect(failuresOf(failed({ formError: "全体の文言" }))).toEqual(["全体の文言"]);
  });

  it("成立していれば何も返さない", () => {
    expect(failuresOf(succeeded)).toEqual([]);
  });

  it("まだ結果が無ければ何も返さない", () => {
    expect(failuresOf(idle)).toEqual([]);
  });

  it("中身の無い項目は飛ばす", () => {
    expect(
      failuresOf(failed({ formError: null, fieldErrors: { couponDiscountRate: undefined } })),
    ).toEqual([]);
  });
});

describe("fieldMessagesOf", () => {
  // ----- 正常系 -----
  it("確認を開く前の判定を、その欄の文言として返す", () => {
    expect(fieldMessagesOf({ couponDiscountRate: "開く前の文言" }, null)).toStrictEqual({
      couponDiscountRate: "開く前の文言",
    });
  });

  it("開く前の判定が無い欄には、送信の結果の先頭の文言を添える", () => {
    expect(
      fieldMessagesOf(
        {},
        failed({
          formError: null,
          fieldErrors: { couponValidityDays: ["結果の文言 1", "結果の文言 2"] },
        }),
      ),
    ).toStrictEqual({ couponValidityDays: "結果の文言 1" });
  });

  it("同じ欄に両方あれば、開く前の判定を優先する", () => {
    expect(
      fieldMessagesOf(
        { couponDiscountRate: "開く前の文言" },
        failed({ formError: null, fieldErrors: { couponDiscountRate: ["結果の文言"] } }),
      ),
    ).toStrictEqual({ couponDiscountRate: "開く前の文言" });
  });

  it("欄ごとに別の出どころから選ぶ", () => {
    expect(
      fieldMessagesOf(
        { couponDiscountRate: "開く前の文言" },
        failed({ formError: null, fieldErrors: { couponValidityDays: ["結果の文言"] } }),
      ),
    ).toStrictEqual({ couponDiscountRate: "開く前の文言", couponValidityDays: "結果の文言" });
  });

  it("結果が下げられていれば、開く前の判定だけを見る", () => {
    expect(fieldMessagesOf({}, null)).toStrictEqual({});
  });

  it("失敗でない結果からは文言を拾わない", () => {
    expect(fieldMessagesOf({}, succeeded)).toStrictEqual({});
  });

  it("項目の誤りを持たない失敗からは文言を拾わない", () => {
    expect(fieldMessagesOf({}, failed({ formError: "全体の文言" }))).toStrictEqual({});
  });
});
