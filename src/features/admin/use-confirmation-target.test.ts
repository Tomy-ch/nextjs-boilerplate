// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { failedActionState, idleActionState, succeededActionState } from "@/model/action-state";

import { useConfirmationTarget } from "./use-confirmation-target";

type State = { readonly status: "idle" | "success" | "error" };

const TARGET = { name: "対象" };
const OTHER = { name: "別の対象" };
const IDLE: State = idleActionState();

function renderTarget(initial: State = IDLE) {
  return renderHook(({ state }) => useConfirmationTarget<typeof TARGET>(state), {
    initialProps: { state: initial },
  });
}

function renderAnsweringTarget() {
  return renderHook(
    ({ state }) => useConfirmationTarget<typeof TARGET>(state, (current) => current === TARGET),
    { initialProps: { state: IDLE } },
  );
}

describe("useConfirmationTarget", () => {
  // ----- 正常系 -----
  it("確認する相手を持たずに始まる", () => {
    const { result } = renderTarget();

    expect(result.current.target).toBeNull();
  });

  it("選ばれた相手を、確認する相手として持つ", () => {
    const { result } = renderTarget();

    act(() => result.current.confirm(TARGET));

    expect(result.current.target).toBe(TARGET);
  });

  it("確認をやめたら、相手を手放す", () => {
    const { result } = renderTarget();

    act(() => result.current.confirm(TARGET));
    act(() => result.current.dismiss());

    expect(result.current.target).toBeNull();
  });

  it("成立の結果が返ったら、確認を閉じる", () => {
    const { result, rerender } = renderTarget();

    act(() => result.current.confirm(TARGET));
    rerender({ state: succeededActionState({ code: "SPRING2026" }) });

    expect(result.current.target).toBeNull();
  });

  it("失敗の結果が返ったら、確認を閉じる", () => {
    const { result, rerender } = renderTarget();

    act(() => result.current.confirm(TARGET));
    rerender({ state: failedActionState({ formError: "拒まれました" }) });

    expect(result.current.target).toBeNull();
  });

  it("結果を伴わない応答が返っても、確認を閉じない", () => {
    const { result, rerender } = renderTarget();

    act(() => result.current.confirm(TARGET));
    rerender({ state: idleActionState() });

    expect(result.current.target).toBe(TARGET);
  });

  it("同じ結果のまま描き直されても、開き直した確認を閉じない", () => {
    const succeeded = succeededActionState({ code: "SPRING2026" });
    const { result, rerender } = renderTarget(succeeded);

    act(() => result.current.confirm(TARGET));
    rerender({ state: succeeded });

    expect(result.current.target).toBe(TARGET);
  });

  it("結果で閉じた後も、別の相手で開き直せる", () => {
    const { result, rerender } = renderTarget();

    act(() => result.current.confirm(TARGET));
    rerender({ state: succeededActionState({ code: "SPRING2026" }) });
    act(() => result.current.confirm(OTHER));

    expect(result.current.target).toBe(OTHER);
  });

  it("結果が開いている相手への送信に答えたものでなければ、確認を閉じない", () => {
    const { result, rerender } = renderAnsweringTarget();

    act(() => result.current.confirm(OTHER));
    rerender({ state: succeededActionState({ code: "SPRING2026" }) });

    expect(result.current.target).toBe(OTHER);
  });

  it("結果が開いている相手への送信に答えたものなら、確認を閉じる", () => {
    const { result, rerender } = renderAnsweringTarget();

    act(() => result.current.confirm(TARGET));
    rerender({ state: succeededActionState({ code: "SPRING2026" }) });

    expect(result.current.target).toBeNull();
  });

  it("開く操作と閉じる操作は、描き直しても同じ関数のまま保つ", () => {
    const { result, rerender } = renderTarget();
    const { confirm, dismiss } = result.current;

    rerender({ state: succeededActionState({ code: "SPRING2026" }) });

    expect(result.current.confirm).toBe(confirm);
    expect(result.current.dismiss).toBe(dismiss);
  });
});
