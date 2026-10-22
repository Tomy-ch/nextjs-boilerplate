import { describe, expect, it } from "vitest";

import { ErrorKind, errorKinds } from "@/errors/error-kind";

import { failedActionState, idleActionState, succeededActionState } from "./action-state";
import { leavesOutcomeOpen, newIdempotencyKey, settlesSubmission } from "./idempotency-key";

const OUTCOME_OPEN_KINDS: readonly ErrorKind[] = [
  ErrorKind.TOO_MANY_REQUESTS,
  ErrorKind.CANCELED,
  ErrorKind.UNAVAILABLE,
  ErrorKind.INTERNAL,
];
const OUTCOME_SETTLED_KINDS = errorKinds.filter((kind) => !OUTCOME_OPEN_KINDS.includes(kind));

describe("newIdempotencyKey", () => {
  // ----- 正常系 -----
  it("再送を畳める形の鍵を作る", () => {
    expect(newIdempotencyKey()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("呼ぶたびに別の鍵になる", () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });
});

describe("settlesSubmission", () => {
  // ----- 正常系 -----
  it("成功した送信は、その鍵の役目を終える", () => {
    expect(settlesSubmission(succeededActionState(undefined))).toBe(true);
  });

  it("まだ送っていなければ、鍵の役目は終わっていない", () => {
    expect(settlesSubmission(idleActionState())).toBe(false);
  });

  it("分類を持たない失敗では、鍵の役目は終わっていない", () => {
    expect(settlesSubmission(failedActionState({ formError: "失敗しました。" }))).toBe(false);
  });

  it.each(OUTCOME_SETTLED_KINDS)("%s で拒まれた送信は、その鍵の役目を終える", (kind) => {
    expect(settlesSubmission(failedActionState({ kind }))).toBe(true);
  });

  it.each(OUTCOME_OPEN_KINDS)("%s で失敗した送信は、同じ鍵で送り直す", (kind) => {
    expect(settlesSubmission(failedActionState({ kind }))).toBe(false);
  });
});

describe("leavesOutcomeOpen", () => {
  // ----- 正常系 -----
  it("まだ送っていなければ、結果が定まっていないとはしない", () => {
    expect(leavesOutcomeOpen(idleActionState())).toBe(false);
  });

  it("成功した送信は、結果が定まっていないとはしない", () => {
    expect(leavesOutcomeOpen(succeededActionState(undefined))).toBe(false);
  });

  it("分類を持たない失敗は、結果が定まっていないとはしない", () => {
    expect(leavesOutcomeOpen(failedActionState({ formError: "失敗しました。" }))).toBe(false);
  });

  it.each(OUTCOME_OPEN_KINDS)("%s で失敗した送信は、結果が定まっていない", (kind) => {
    expect(leavesOutcomeOpen(failedActionState({ kind }))).toBe(true);
  });

  it.each(OUTCOME_SETTLED_KINDS)("%s で拒まれた送信は、結果が定まっていないとはしない", (kind) => {
    expect(leavesOutcomeOpen(failedActionState({ kind }))).toBe(false);
  });
});
