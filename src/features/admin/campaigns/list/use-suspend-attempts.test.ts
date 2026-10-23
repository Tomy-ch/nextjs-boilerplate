// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ErrorKind } from "@/errors/error-kind";
import { failedActionState, idleActionState, succeededActionState } from "@/model/action-state";
import { type CampaignId, toCampaignId } from "@/model/campaign/campaign";

import type { SuspendCampaignState } from "./form-state";
import { type SuspendAttempts, useSuspendAttempts } from "./use-suspend-attempts";

const FIRST = toCampaignId("0195f0c2-0000-7000-8000-0000000000c1");
const SECOND = toCampaignId("0195f0c2-0000-7000-8000-0000000000c2");

const IDLE: SuspendCampaignState = idleActionState();

function renderAttempts() {
  return renderHook(({ state }) => useSuspendAttempts(state), {
    initialProps: { state: IDLE },
  });
}

function keyOf(result: { current: SuspendAttempts }, id: CampaignId): string {
  let key = "";

  act(() => {
    key = result.current.keyFor(id);
  });

  return key;
}

function send(result: { current: SuspendAttempts }, id: CampaignId): string {
  const key = keyOf(result, id);

  act(() => result.current.markSent(id));

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

  it("結果が届くまでは、どの行にも答えていない", () => {
    const { result } = renderAttempts();

    send(result, FIRST);

    expect(result.current.answered).toBeNull();
  });

  it("結果が定まらない失敗の後に同じ行を選び直すと、同じキーで送り直す", () => {
    const { result, rerender } = renderAttempts();
    const sent = send(result, FIRST);

    rerender({ state: failedActionState({ kind: ErrorKind.UNAVAILABLE }) });

    expect(keyOf(result, FIRST)).toBe(sent);
  });

  it("停止が成立したら、同じ行の次の送信は新しいキーにする", () => {
    const { result, rerender } = renderAttempts();
    const sent = send(result, FIRST);

    rerender({ state: succeededActionState({ code: "SPRING2026" }) });

    expect(keyOf(result, FIRST)).not.toBe(sent);
  });

  it("結果が定まった拒否の後は、同じ行の次の送信は新しいキーにする", () => {
    const { result, rerender } = renderAttempts();
    const sent = send(result, FIRST);

    rerender({ state: failedActionState({ kind: ErrorKind.CONFLICT }) });

    expect(keyOf(result, FIRST)).not.toBe(sent);
  });

  it("送信中に別の行を選んでも、届いた結果は先に送った行に答える", () => {
    const { result, rerender } = renderAttempts();
    const sent = send(result, FIRST);
    const other = keyOf(result, SECOND);

    rerender({ state: succeededActionState({ code: "SPRING2026" }) });

    expect(result.current.answered).toBe(FIRST);
    expect(keyOf(result, SECOND)).toBe(other);
    expect(keyOf(result, FIRST)).not.toBe(sent);
  });

  it("続けて送った結果は、送った順に行へ答える", () => {
    const { result, rerender } = renderAttempts();

    send(result, FIRST);
    send(result, SECOND);
    rerender({ state: failedActionState({ kind: ErrorKind.INTERNAL }) });

    expect(result.current.answered).toBe(FIRST);

    rerender({ state: succeededActionState({ code: "SUMMER2026" }) });

    expect(result.current.answered).toBe(SECOND);
  });

  it("結果が定まっても、送っていない別の行の試みは保つ", () => {
    const { result, rerender } = renderAttempts();
    const pending = send(result, FIRST);

    rerender({ state: failedActionState({ kind: ErrorKind.INTERNAL }) });
    send(result, SECOND);
    rerender({ state: succeededActionState({ code: "SUMMER2026" }) });

    expect(keyOf(result, FIRST)).toBe(pending);
  });
});
