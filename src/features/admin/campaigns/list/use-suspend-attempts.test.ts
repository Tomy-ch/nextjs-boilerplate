// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ErrorKind } from "@/errors/error-kind";
import { failedActionState, idleActionState, succeededActionState } from "@/model/action-state";
import { type CampaignId, toCampaignId } from "@/model/campaign/campaign";

import type { RowActionAnswer } from "../../use-row-action-state";
import type { SuspendCampaignState } from "./form-state";
import { useSuspendAttempts } from "./use-suspend-attempts";

const FIRST = toCampaignId("0195f0c2-0000-7000-8000-0000000000c1");
const SECOND = toCampaignId("0195f0c2-0000-7000-8000-0000000000c2");

const NOTHING_SENT: RowActionAnswer<SuspendCampaignState> = {
  row: null,
  result: idleActionState(),
};

function answerOf(row: CampaignId, result: SuspendCampaignState) {
  return { row, result };
}

function renderAttempts() {
  return renderHook(({ answer }) => useSuspendAttempts(answer), {
    initialProps: { answer: NOTHING_SENT },
  });
}

function keyOf(result: { current: (id: CampaignId) => string }, id: CampaignId): string {
  let key = "";

  act(() => {
    key = result.current(id);
  });

  return key;
}

describe("useSuspendAttempts", () => {
  // ----- 正常系 -----
  it("同じ行を送る前に選び直しても、同じキーを使う", () => {
    const { result } = renderAttempts();

    expect(keyOf(result, FIRST)).toBe(keyOf(result, FIRST));
  });

  it("別の行には別のキーを使う", () => {
    const { result } = renderAttempts();

    expect(keyOf(result, FIRST)).not.toBe(keyOf(result, SECOND));
  });

  it("結果が定まらない失敗の後に同じ行を選び直すと、同じキーで送り直す", () => {
    const { result, rerender } = renderAttempts();
    const sent = keyOf(result, FIRST);

    rerender({ answer: answerOf(FIRST, failedActionState({ kind: ErrorKind.UNAVAILABLE })) });

    expect(keyOf(result, FIRST)).toBe(sent);
  });

  it("停止が成立したら、同じ行の次の送信は新しいキーにする", () => {
    const { result, rerender } = renderAttempts();
    const sent = keyOf(result, FIRST);

    rerender({ answer: answerOf(FIRST, succeededActionState({ code: "SPRING2026" })) });

    expect(keyOf(result, FIRST)).not.toBe(sent);
  });

  it("結果が定まった拒否の後は、同じ行の次の送信は新しいキーにする", () => {
    const { result, rerender } = renderAttempts();
    const sent = keyOf(result, FIRST);

    rerender({ answer: answerOf(FIRST, failedActionState({ kind: ErrorKind.CONFLICT })) });

    expect(keyOf(result, FIRST)).not.toBe(sent);
  });

  it("別の行に答えた結果では、この行のキーを手放さない", () => {
    const { result, rerender } = renderAttempts();
    const pending = keyOf(result, FIRST);

    keyOf(result, SECOND);
    rerender({ answer: answerOf(SECOND, succeededActionState({ code: "SUMMER2026" })) });

    expect(keyOf(result, FIRST)).toBe(pending);
  });
});
