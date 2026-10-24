// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ErrorKind } from "@/errors/error-kind";
import {
  type ActionState,
  failedActionState,
  idleActionState,
  succeededActionState,
} from "@/model/action-state";
import type { ConflictMeaning } from "@/model/idempotency-key";

import { useSubmissionKey } from "./use-submission-key";

const INITIAL_KEY = "0195f0c2-0000-7000-8000-0000000000aa";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = {
  state: ActionState<unknown>;
  initialKey?: string;
  conflict?: ConflictMeaning;
};

function renderKey(initial: Props) {
  return renderHook(({ state, ...options }: Props) => useSubmissionKey(state, options), {
    initialProps: initial,
  });
}

describe("useSubmissionKey", () => {
  // ----- 正常系 -----
  it("最初の鍵を渡せば、それを使う", () => {
    const { result } = renderKey({ state: idleActionState(), initialKey: INITIAL_KEY });

    expect(result.current.idempotencyKey).toBe(INITIAL_KEY);
  });

  it("指定を渡さなければ、mount のときに鍵を作る", () => {
    const { result } = renderHook(() => useSubmissionKey(idleActionState()));

    expect(result.current.idempotencyKey).toMatch(UUID);
    expect(result.current.outcomeOpen).toBe(false);
  });

  it("最初の鍵が差し替わっても、mount のときの鍵を使い続ける", () => {
    const { result, rerender } = renderKey({ state: idleActionState(), initialKey: INITIAL_KEY });

    rerender({ state: idleActionState(), initialKey: "0195f0c2-0000-7000-8000-0000000000bb" });

    expect(result.current.idempotencyKey).toBe(INITIAL_KEY);
  });

  it("成功したら鍵を作り直す", () => {
    const { result, rerender } = renderKey({ state: idleActionState(), initialKey: INITIAL_KEY });

    rerender({ state: succeededActionState(undefined), initialKey: INITIAL_KEY });

    expect(result.current.idempotencyKey).toMatch(UUID);
    expect(result.current.idempotencyKey).not.toBe(INITIAL_KEY);
    expect(result.current.outcomeOpen).toBe(false);
  });

  it("結果が定まらない失敗のあとに成功したら、鍵を作り直し、結果が定まっていないとは返さない", () => {
    const { result, rerender } = renderKey({ state: idleActionState(), initialKey: INITIAL_KEY });

    rerender({
      state: failedActionState({ kind: ErrorKind.UNAVAILABLE }),
      initialKey: INITIAL_KEY,
    });
    rerender({ state: succeededActionState(undefined), initialKey: INITIAL_KEY });

    expect(result.current.idempotencyKey).not.toBe(INITIAL_KEY);
    expect(result.current.outcomeOpen).toBe(false);
  });

  it("同じ結果のまま描き直しても、鍵を作り直さない", () => {
    const settled = succeededActionState(undefined);
    const { result, rerender } = renderKey({ state: idleActionState() });

    rerender({ state: settled });
    const renewed = result.current.idempotencyKey;
    rerender({ state: settled });

    expect(result.current.idempotencyKey).toBe(renewed);
  });

  // ----- 異常系 -----
  it("結果の定まった拒否のあとは鍵を作り直す", () => {
    const { result, rerender } = renderKey({ state: idleActionState(), initialKey: INITIAL_KEY });

    rerender({ state: failedActionState({ kind: ErrorKind.VALIDATION }), initialKey: INITIAL_KEY });

    expect(result.current.idempotencyKey).not.toBe(INITIAL_KEY);
    expect(result.current.outcomeOpen).toBe(false);
  });

  it("分類を持たない失敗は送る前に止めたものとして、同じ鍵のまま結果が定まっていないとは返さない", () => {
    const { result, rerender } = renderKey({ state: idleActionState(), initialKey: INITIAL_KEY });

    rerender({ state: failedActionState({ formError: "送れません。" }), initialKey: INITIAL_KEY });

    expect(result.current.idempotencyKey).toBe(INITIAL_KEY);
    expect(result.current.outcomeOpen).toBe(false);
  });

  it("結果が定まらない失敗では、同じ鍵のまま結果が定まっていないと返す", () => {
    const { result, rerender } = renderKey({ state: idleActionState(), initialKey: INITIAL_KEY });

    rerender({
      state: failedActionState({ kind: ErrorKind.UNAVAILABLE }),
      initialKey: INITIAL_KEY,
    });

    expect(result.current.idempotencyKey).toBe(INITIAL_KEY);
    expect(result.current.outcomeOpen).toBe(true);
  });

  it("競合を処理中に充てる送信先では、競合のあとも同じ鍵のまま結果が定まっていないと返す", () => {
    const conflict = "in-progress" satisfies ConflictMeaning;
    const { result, rerender } = renderKey({
      state: idleActionState(),
      initialKey: INITIAL_KEY,
      conflict,
    });

    rerender({
      state: failedActionState({ kind: ErrorKind.CONFLICT }),
      initialKey: INITIAL_KEY,
      conflict,
    });

    expect(result.current.idempotencyKey).toBe(INITIAL_KEY);
    expect(result.current.outcomeOpen).toBe(true);
  });

  it("競合の意味を宣言しなければ、競合は結果の定まった拒否として鍵を作り直す", () => {
    const { result, rerender } = renderKey({ state: idleActionState(), initialKey: INITIAL_KEY });

    rerender({ state: failedActionState({ kind: ErrorKind.CONFLICT }), initialKey: INITIAL_KEY });

    expect(result.current.idempotencyKey).not.toBe(INITIAL_KEY);
    expect(result.current.outcomeOpen).toBe(false);
  });
});
