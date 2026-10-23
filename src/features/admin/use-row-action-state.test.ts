// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { startTransition } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  type ActionState,
  failedActionState,
  idleActionState,
  succeededActionState,
} from "@/model/action-state";

import { useRowActionState } from "./use-row-action-state";

type State = ActionState<{ readonly name: string }>;

const IDLE: State = idleActionState();

function formWith(entries: Record<string, string>): FormData {
  const formData = new FormData();

  for (const [name, value] of Object.entries(entries)) formData.set(name, value);

  return formData;
}

function renderRowAction(action: (state: State, formData: FormData) => Promise<State>) {
  return renderHook(() => useRowActionState<State>(action, IDLE, "rowId"));
}

async function send(dispatch: (formData: FormData) => void, formData: FormData) {
  await act(async () => {
    startTransition(() => dispatch(formData));
  });
}

describe("useRowActionState", () => {
  // ----- 正常系 -----
  it("まだ何も送っていなければ、どの行にも答えていない初めの結果を持つ", () => {
    const { result } = renderRowAction(() => Promise.resolve(IDLE));

    expect(result.current[0]).toEqual({ row: null, result: IDLE });
  });

  it("送った form が載せていた行とともに、操作の結果を持つ", async () => {
    const succeeded = succeededActionState({ name: "山田" });
    const { result } = renderRowAction(() => Promise.resolve(succeeded));

    await send(result.current[1], formWith({ rowId: "row-1" }));

    expect(result.current[0]).toEqual({ row: "row-1", result: succeeded });
  });

  it("操作には、送った form と直前の結果をそのまま渡す", async () => {
    const action = vi.fn((_state: State, _formData: FormData) => Promise.resolve(IDLE));
    const formData = formWith({ rowId: "row-1", note: "理由" });
    const { result } = renderRowAction(action);

    await send(result.current[1], formData);

    expect(action).toHaveBeenCalledWith(IDLE, formData);
  });

  it("続けて送ると、それぞれの結果が送った行に答える", async () => {
    const results = [failedActionState<{ readonly name: string }>({}), IDLE];
    const action = vi.fn(() => Promise.resolve(results.shift() ?? IDLE));
    const { result } = renderRowAction(action);

    await send(result.current[1], formWith({ rowId: "row-1" }));

    expect(result.current[0].row).toBe("row-1");

    await send(result.current[1], formWith({ rowId: "row-2" }));

    expect(result.current[0].row).toBe("row-2");
  });

  // ----- 異常系 -----
  it("行の識別子が form に無ければ、どの行にも答えていない結果として持つ", async () => {
    const { result } = renderRowAction(() => Promise.resolve(IDLE));

    await send(result.current[1], formWith({}));

    expect(result.current[0].row).toBeNull();
  });
});
