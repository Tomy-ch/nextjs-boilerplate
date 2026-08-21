import { describe, expect, it } from "vitest";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

import {
  actionStateFromError,
  failedActionState,
  idleActionState,
  succeededActionState,
} from "./action-state";

describe("idleActionState", () => {
  // ----- 正常系 -----
  it("送信前を表す状態を返す", () => {
    expect(idleActionState()).toEqual({ status: "idle" });
  });
});

describe("succeededActionState", () => {
  // ----- 正常系 -----
  it("渡した値を成功の状態に載せる", () => {
    expect(succeededActionState({ id: "u-1" })).toEqual({
      status: "success",
      value: { id: "u-1" },
    });
  });

  it("値が undefined でも成功として扱う", () => {
    expect(succeededActionState(undefined)).toEqual({ status: "success", value: undefined });
  });
});

describe("failedActionState", () => {
  // ----- 正常系 -----
  it("引数を省略したときフォーム全体の文言を null にする", () => {
    expect(failedActionState()).toEqual({
      status: "error",
      formError: null,
      fieldErrors: undefined,
    });
  });

  it("フォーム全体の文言を渡すとそのまま載せる", () => {
    expect(failedActionState({ formError: "保存できませんでした。" })).toEqual({
      status: "error",
      formError: "保存できませんでした。",
      fieldErrors: undefined,
    });
  });

  it("フォーム全体の文言に null を渡しても null のままにする", () => {
    expect(failedActionState({ formError: null })).toMatchObject({ formError: null });
  });

  it("項目ごとの文言を渡すと項目名をキーにして保つ", () => {
    const state = failedActionState<never, "email">({
      fieldErrors: { email: ["メールアドレスの形式が正しくありません。"] },
    });

    expect(state).toEqual({
      status: "error",
      formError: null,
      fieldErrors: { email: ["メールアドレスの形式が正しくありません。"] },
    });
  });

  it("1 つの項目に複数の文言を渡してもすべて残す", () => {
    const state = failedActionState<never, "phone">({
      fieldErrors: { phone: ["電話番号を入力してください。", "10〜15 桁で入力してください。"] },
    });

    expect(state.status === "error" && state.fieldErrors?.phone).toHaveLength(2);
  });
});

describe("actionStateFromError", () => {
  // ----- 正常系 -----
  it("分類の付いたエラーはカタログの文言を載せた失敗にする", () => {
    expect(actionStateFromError(createAppError(ErrorKind.CONFLICT))).toEqual({
      status: "error",
      formError: "現在の状態ではこの操作を実行できません。",
      fieldErrors: undefined,
      kind: ErrorKind.CONFLICT,
    });
  });

  it("何が起きたかの分類も載せる。画面が文言ではなく分類で出し分けるため", () => {
    const state = actionStateFromError(createAppError(ErrorKind.CONFLICT));

    expect(state.status === "error" && state.kind).toBe(ErrorKind.CONFLICT);
  });

  it("分類が cause の先にあっても辿って文言を決める", () => {
    const wrapped = new Error("upstream", {
      cause: createAppError(ErrorKind.PERMISSION_DENIED),
    });

    expect(actionStateFromError(wrapped)).toMatchObject({
      formError: "この操作を実行する権限がありません。",
    });
  });

  // ----- 異常系 -----
  it("分類の付いていないエラーは internal の文言にする", () => {
    expect(actionStateFromError(new Error("boom"))).toEqual({
      status: "error",
      formError: "問題が発生しました。時間をおいて再試行してください。",
      fieldErrors: undefined,
      kind: ErrorKind.INTERNAL,
    });
  });

  it("Error ですらない値を渡しても文言のある失敗を返す", () => {
    expect(actionStateFromError("boom")).toMatchObject({
      status: "error",
      formError: "問題が発生しました。時間をおいて再試行してください。",
    });
  });
});
