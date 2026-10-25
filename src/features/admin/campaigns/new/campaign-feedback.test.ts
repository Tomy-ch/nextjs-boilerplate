import { describe, expect, it } from "vitest";

import { ErrorKind } from "@/errors/error-kind";
import { type FieldErrors, failedActionState, idleActionState } from "@/model/action-state";

import { closesConfirmation, failuresOf, fieldMessagesOf } from "./campaign-feedback";
import {
  CAMPAIGN_CODE_CONFLICT_MESSAGE,
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

describe("failuresOf", () => {
  // ----- 正常系 -----
  it("全体の文言だけの失敗なら、その文言を返す", () => {
    expect(failuresOf(failed({ formError: "全体の文言" }))).toEqual(["全体の文言"]);
  });

  it("欄の誤りがある失敗では、欄の側に出るため何も返さない", () => {
    expect(
      failuresOf(failed({ formError: "全体の文言", fieldErrors: { code: ["コードの文言"] } })),
    ).toEqual([]);
  });

  it("全体の文言が無い失敗では何も返さない", () => {
    expect(failuresOf(failed({ formError: null }))).toEqual([]);
  });

  it("まだ結果が無ければ何も返さない", () => {
    expect(failuresOf(idle)).toEqual([]);
  });
});

describe("fieldMessagesOf", () => {
  // ----- 正常系 -----
  it("結果が下げられていれば、送る前の判定をそのまま返す", () => {
    expect(fieldMessagesOf({ endsAt: "判定の文言" }, null)).toStrictEqual({
      endsAt: "判定の文言",
    });
  });

  it("送る前の判定が無い欄には、送り返された先頭の文言を添える", () => {
    expect(
      fieldMessagesOf(
        {},
        failed({ formError: null, fieldErrors: { totalLimit: ["結果の文言 1", "結果の文言 2"] } }),
      ),
    ).toStrictEqual({ totalLimit: "結果の文言 1" });
  });

  it("同じ欄に両方あれば、送る前の判定を優先する", () => {
    expect(
      fieldMessagesOf(
        { code: "判定の文言" },
        failed({ formError: null, fieldErrors: { code: [CAMPAIGN_CODE_CONFLICT_MESSAGE] } }),
      ),
    ).toStrictEqual({ code: "判定の文言" });
  });

  it("欄ごとに別の出どころから選ぶ", () => {
    expect(
      fieldMessagesOf(
        { startsAt: "判定の文言" },
        failed({ formError: null, fieldErrors: { perUserLimit: ["結果の文言"] } }),
      ),
    ).toStrictEqual({ startsAt: "判定の文言", perUserLimit: "結果の文言" });
  });

  it("手元の判定がコードに何も出していなければ、送り返されたコードの重複の文言を残す", () => {
    expect(
      fieldMessagesOf(
        { endsAt: "判定の文言" },
        failed({
          formError: null,
          fieldErrors: { code: [CAMPAIGN_CODE_CONFLICT_MESSAGE] },
          kind: ErrorKind.CONFLICT,
        }),
      ),
    ).toStrictEqual({ code: CAMPAIGN_CODE_CONFLICT_MESSAGE, endsAt: "判定の文言" });
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
        failed({ formError: null, fieldErrors: { code: [], totalLimit: undefined } }),
      ),
    ).toStrictEqual({});
  });
});
