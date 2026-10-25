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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = {
  state: ActionState<unknown>;
  conflict?: ConflictMeaning;
};

function renderKey(initial: Props) {
  return renderHook(({ state, ...options }: Props) => useSubmissionKey(state, options), {
    initialProps: initial,
  });
}

describe("useSubmissionKey", () => {
  // ----- 正常系 -----
  it("mount するたびに別の鍵を作る", () => {
    const { result: first } = renderKey({ state: idleActionState() });
    const { result: second } = renderKey({ state: idleActionState() });

    expect(second.current.idempotencyKey).toMatch(UUID);
    expect(second.current.idempotencyKey).not.toBe(first.current.idempotencyKey);
  });

  it("指定を渡さなければ、mount のときに鍵を作る", () => {
    const { result } = renderHook(() => useSubmissionKey(idleActionState()));

    expect(result.current.idempotencyKey).toMatch(UUID);
    expect(result.current.outcomeOpen).toBe(false);
  });

  it("送信の結果が届かないまま描き直しても、mount のときの鍵を使い続ける", () => {
    const { result, rerender } = renderKey({ state: idleActionState() });
    const first = result.current.idempotencyKey;

    rerender({ state: idleActionState() });

    expect(result.current.idempotencyKey).toBe(first);
  });

  it("成功したら鍵を作り直す", () => {
    const { result, rerender } = renderKey({ state: idleActionState() });
    const first = result.current.idempotencyKey;

    rerender({ state: succeededActionState(undefined) });

    expect(result.current.idempotencyKey).toMatch(UUID);
    expect(result.current.idempotencyKey).not.toBe(first);
    expect(result.current.outcomeOpen).toBe(false);
  });

  it("結果が定まらない失敗のあとに成功したら、鍵を作り直し、結果が定まっていないとは返さない", () => {
    const { result, rerender } = renderKey({ state: idleActionState() });
    const first = result.current.idempotencyKey;

    rerender({ state: failedActionState({ kind: ErrorKind.UNAVAILABLE }) });
    rerender({ state: succeededActionState(undefined) });

    expect(result.current.idempotencyKey).not.toBe(first);
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
    const { result, rerender } = renderKey({ state: idleActionState() });
    const first = result.current.idempotencyKey;

    rerender({ state: failedActionState({ kind: ErrorKind.VALIDATION }) });

    expect(result.current.idempotencyKey).not.toBe(first);
    expect(result.current.outcomeOpen).toBe(false);
  });

  it("分類を持たない失敗は送る前に止めたものとして、同じ鍵のまま結果が定まっていないとは返さない", () => {
    const { result, rerender } = renderKey({ state: idleActionState() });
    const first = result.current.idempotencyKey;

    rerender({ state: failedActionState({ formError: "送れません。" }) });

    expect(result.current.idempotencyKey).toBe(first);
    expect(result.current.outcomeOpen).toBe(false);
  });

  it("結果が定まらない失敗では、同じ鍵のまま結果が定まっていないと返す", () => {
    const { result, rerender } = renderKey({ state: idleActionState() });
    const first = result.current.idempotencyKey;

    rerender({ state: failedActionState({ kind: ErrorKind.UNAVAILABLE }) });

    expect(result.current.idempotencyKey).toBe(first);
    expect(result.current.outcomeOpen).toBe(true);
  });

  it("競合を処理中に充てる送信先では、競合のあとも同じ鍵のまま結果が定まっていないと返す", () => {
    const conflict = "in-progress" satisfies ConflictMeaning;
    const { result, rerender } = renderKey({ state: idleActionState(), conflict });
    const first = result.current.idempotencyKey;

    rerender({ state: failedActionState({ kind: ErrorKind.CONFLICT }), conflict });

    expect(result.current.idempotencyKey).toBe(first);
    expect(result.current.outcomeOpen).toBe(true);
  });

  it("競合の意味を宣言しなければ、競合は結果の定まった拒否として鍵を作り直す", () => {
    const { result, rerender } = renderKey({ state: idleActionState() });
    const first = result.current.idempotencyKey;

    rerender({ state: failedActionState({ kind: ErrorKind.CONFLICT }) });

    expect(result.current.idempotencyKey).not.toBe(first);
    expect(result.current.outcomeOpen).toBe(false);
  });
});
