"use client";

import { useCallback, useState } from "react";

import type { ActionState } from "@/model/action-state";

/**
 * 確認している相手と、確認を開く・閉じる操作。
 *
 * @typeParam T - 確認の相手の型
 */
export type ConfirmationTarget<T> = {
  /** 確認している相手。確認を開いていなければ null。 */
  readonly target: T | null;
  /** 相手を渡して確認を開く。 */
  readonly confirm: (target: T) => void;
  /** 何も送らずに確認を閉じる。 */
  readonly dismiss: () => void;
};

/**
 * 一覧の行に対する確認を、開いてから結果が返るまで持つ。
 *
 * @remarks
 * **確認を閉じるのは結果が返ったときで、送信を押した瞬間ではありません。** 送信中に閉じると form
 * ごと外れ、何が起きたかが誰にも届きません。結果は成否を問わず閉じます。
 *
 * `state` には `useActionState` が返す結果をそのまま渡します。結果は届くたびに新しい参照になるので、
 * 参照が変わったことで到着を知ります。
 *
 * 結果が別の相手への送信に答えたものなら、開いている確認は閉じません。送信中に確認を閉じて別の
 * 相手を開けるため、届いた結果がいま開いている相手のものとは限りません。
 *
 * @typeParam T - 確認の相手の型
 * @param state - 確認から送った操作の、いまの結果
 * @param answers - いまの結果が、開いている相手への送信に答えたものか。省くと、どの結果でも閉じる
 * @returns 確認している相手と、確認を開く・閉じる操作
 */
export function useConfirmationTarget<T>(
  state: { readonly status: ActionState<unknown>["status"] },
  answers: (target: T) => boolean = () => true,
): ConfirmationTarget<T> {
  const [target, setTarget] = useState<T | null>(null);
  const [seenState, setSeenState] = useState(state);

  // effect にすると閉じる前の描画が一度挟まり、報せと開いたままの確認が同時に見える。
  if (seenState !== state) {
    setSeenState(state);

    if (state.status !== "idle" && target !== null && answers(target)) setTarget(null);
  }

  /** 相手を渡して確認を開く。 */
  const confirm = useCallback((next: T) => setTarget(() => next), []);
  /** 何も送らずに確認を閉じる。 */
  const dismiss = useCallback(() => setTarget(null), []);

  return { target, confirm, dismiss };
}
