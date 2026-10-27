import { describe, expect, it } from "vitest";

import {
  type ActionState,
  type FieldErrors,
  failedActionState,
  idleActionState,
  succeededActionState,
} from "@/model/action-state";

import { failuresOf, fieldMessagesOf } from "./confirmation-feedback";

type Field = "name" | "note";

type State = ActionState<void, Field>;

const idle: State = idleActionState();

const succeeded: State = succeededActionState(undefined);

function failed(options: { formError?: string | null; fieldErrors?: FieldErrors<Field> }): State {
  return failedActionState<void, Field>(options);
}

function closesOnFieldErrors(state: State): boolean {
  return state.status === "error" && Object.keys(state.fieldErrors ?? {}).length > 0;
}

describe("failuresOf", () => {
  // ----- 正常系 -----
  it("確認を閉じない失敗なら、全体の文言を返す", () => {
    expect(failuresOf(failed({ formError: "全体の文言" }), closesOnFieldErrors)).toEqual([
      "全体の文言",
    ]);
  });

  it("確認を閉じる失敗では、確認の外に出るため何も返さない", () => {
    expect(
      failuresOf(
        failed({ formError: "全体の文言", fieldErrors: { name: ["名前の文言"] } }),
        closesOnFieldErrors,
      ),
    ).toEqual([]);
  });

  it("閉じるかは渡された判定に従う", () => {
    expect(failuresOf(failed({ formError: "全体の文言" }), () => true)).toEqual([]);
  });

  it("全体の文言が無い失敗では何も返さない", () => {
    expect(failuresOf(failed({ formError: null }), closesOnFieldErrors)).toEqual([]);
  });

  it("成功なら何も返さない", () => {
    expect(failuresOf(succeeded, () => false)).toEqual([]);
  });

  it("まだ結果が無ければ何も返さない", () => {
    expect(failuresOf(idle, closesOnFieldErrors)).toEqual([]);
  });
});

describe("fieldMessagesOf", () => {
  // ----- 正常系 -----
  it("結果が下げられていれば、送る前の判定をそのまま返す", () => {
    expect(fieldMessagesOf({ name: "判定の文言" }, null)).toStrictEqual({ name: "判定の文言" });
  });

  it("送る前の判定が無い欄には、送り返された先頭の文言を添える", () => {
    expect(
      fieldMessagesOf(
        {},
        failed({ formError: null, fieldErrors: { note: ["結果の文言 1", "結果の文言 2"] } }),
      ),
    ).toStrictEqual({ note: "結果の文言 1" });
  });

  it("同じ欄に両方あれば、送る前の判定を優先する", () => {
    expect(
      fieldMessagesOf(
        { name: "判定の文言" },
        failed({ formError: null, fieldErrors: { name: ["結果の文言"] } }),
      ),
    ).toStrictEqual({ name: "判定の文言" });
  });

  it("欄ごとに別の出どころから選ぶ", () => {
    expect(
      fieldMessagesOf(
        { name: "判定の文言" },
        failed({ formError: null, fieldErrors: { note: ["結果の文言"] } }),
      ),
    ).toStrictEqual({ name: "判定の文言", note: "結果の文言" });
  });

  it("成功の結果からは文言を拾わず、送る前の判定だけを見る", () => {
    expect(fieldMessagesOf({ name: "判定の文言" }, succeeded)).toStrictEqual({
      name: "判定の文言",
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
      fieldMessagesOf({}, failed({ formError: null, fieldErrors: { name: [], note: undefined } })),
    ).toStrictEqual({});
  });
});
