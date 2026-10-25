"use client";

import { useState } from "react";

import type { ActionState } from "@/model/action-state";
import {
  type ConflictMeaning,
  leavesOutcomeOpen,
  newIdempotencyKey,
  settlesSubmission,
} from "@/model/idempotency-key";

/** {@link useSubmissionKey} の任意の指定。 */
export type SubmissionKeyOptions = {
  /**
   * 送信先が競合（409）を何に充てているか。
   *
   * @defaultValue "state-conflict"
   */
  readonly conflict?: ConflictMeaning;
};

/** {@link useSubmissionKey} が返すもの。 */
export type SubmissionKey = {
  /** 次の送信に載せる冪等キー。 */
  readonly idempotencyKey: string;
  /** 直前の送信の結果が定まっていないか。true のあいだ、送信の中身を形づくる入力を変えさせない。 */
  readonly outcomeOpen: boolean;
};

/**
 * 送信 1 回ぶんの冪等キーを持ち、応答が送信を確定させたら作り直す。
 *
 * @remarks
 * **鍵は mount のときに作って持ち続け、`state` が変わったときだけ見直します。** server が作って
 * props で渡した鍵は client の router cache が持つ画面の写しに残り、成立して別の画面へ移った後に
 * 「戻る」で戻ると、送り終えた鍵のまま island が作り直されます。
 *
 * 作り直すかと、結果が定まっていないかは、同じ `state` と同じ `conflict` から
 * `model/idempotency-key.ts` が決めます。2 つを別々に呼ぶと、競合の意味を片方にだけ渡す食い違いを
 * 書けてしまいます。
 *
 * @param state - 直近の送信が返した結果
 * @param options - 送信先が競合を何に充てているか
 * @returns 次の送信に載せる鍵と、直前の送信の結果が定まっていないか
 *
 * @example
 * ```tsx
 * const [state, formAction] = useActionState(sendAction, idleActionState());
 * const { idempotencyKey, outcomeOpen } = useSubmissionKey(state, { conflict: "in-progress" });
 * ```
 */
export function useSubmissionKey(
  state: ActionState<unknown>,
  { conflict = "state-conflict" }: SubmissionKeyOptions = {},
): SubmissionKey {
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [seenState, setSeenState] = useState(state);

  if (seenState !== state) {
    setSeenState(state);

    if (settlesSubmission(state, conflict)) {
      setIdempotencyKey(newIdempotencyKey());
    }
  }

  return { idempotencyKey, outcomeOpen: leavesOutcomeOpen(state, conflict) };
}
