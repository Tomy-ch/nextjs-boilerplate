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
   * 最初の送信に載せる鍵。画面を組み立てた地点が作ったものを渡す。
   *
   * @defaultValue mount のときに作る鍵
   */
  readonly initialKey?: string;
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
 * 鍵は mount のときの値を持ち続け、`state` が変わったときだけ見直します。作り直すかと、結果が
 * 定まっていないかは、同じ `state` と同じ `conflict` から `model/idempotency-key.ts` が決めます。
 * 2 つを別々に呼ぶと、競合の意味を片方にだけ渡す食い違いを書けてしまいます。
 *
 * `initialKey` は mount のときにだけ読みます。画面の取り直しが prop を差し替えても、書きかけの
 * 入力は残ったまま鍵だけが変わることはありません。
 *
 * @param state - 直近の送信が返した結果
 * @param options - 最初の鍵と、送信先が競合を何に充てているか
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
  { initialKey, conflict = "state-conflict" }: SubmissionKeyOptions = {},
): SubmissionKey {
  const [idempotencyKey, setIdempotencyKey] = useState(() => initialKey ?? newIdempotencyKey());
  const [seenState, setSeenState] = useState(state);

  if (seenState !== state) {
    setSeenState(state);

    if (settlesSubmission(state, conflict)) {
      setIdempotencyKey(newIdempotencyKey());
    }
  }

  return { idempotencyKey, outcomeOpen: leavesOutcomeOpen(state, conflict) };
}
