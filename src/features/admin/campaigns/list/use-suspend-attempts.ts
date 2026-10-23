"use client";

import { useCallback, useState } from "react";

import type { CampaignId } from "@/model/campaign/campaign";
import { newIdempotencyKey, settlesSubmission } from "@/model/idempotency-key";

import type { SuspendCampaignState } from "./form-state";

/** 行ごとの試みのキーと、送った順の行と、いまの結果が答えた行。 */
type Attempts = {
  readonly keys: ReadonlyMap<CampaignId, string>;
  readonly sent: readonly CampaignId[];
  readonly answered: CampaignId | null;
};

/** {@link useSuspendAttempts} が返すもの。 */
export type SuspendAttempts = {
  /** 行の識別子から、その行の試みのキーを返す。 */
  readonly keyFor: (id: CampaignId) => string;
  /** 行の停止を送ったことを記録する。送信のたびに 1 度呼ぶ。 */
  readonly markSent: (id: CampaignId) => void;
  /** いまの結果が答えた行。まだ結果が無ければ null。 */
  readonly answered: CampaignId | null;
};

/**
 * 停止する行ごとに、試みの冪等キーを渡す。
 *
 * @remarks
 * 結果が定まらない失敗の後に同じ行を選び直すと、同じキーを返します。応答が試みを確定させたら
 * （`settlesSubmission`）、その行のキーを手放します。
 *
 * **結果は、送った順に、送った行へ対応づけます。** 送信中に確認を閉じて別の行を開いても、届いた
 * 結果は先に送った行のものです。`useActionState` は送信を送った順に 1 つずつ処理します。
 *
 * @param state - 直近の送信が返した結果
 * @returns 行ごとのキー、送信の記録、いまの結果が答えた行
 */
export function useSuspendAttempts(state: SuspendCampaignState): SuspendAttempts {
  const [attempts, setAttempts] = useState<Attempts>(() => ({
    keys: new Map(),
    sent: [],
    answered: null,
  }));
  const [seenState, setSeenState] = useState(state);
  let current = attempts;

  if (seenState !== state) {
    setSeenState(state);

    const [head = null, ...rest] = attempts.sent;
    const keys = new Map(attempts.keys);

    if (head !== null && settlesSubmission(state)) keys.delete(head);

    current = { keys, sent: rest, answered: head };
    setAttempts(current);
  }

  /** 行の試みのキーを返し、その行のものとして覚える。 */
  const keyFor = useCallback(
    (id: CampaignId) => {
      const key = current.keys.get(id) ?? newIdempotencyKey();

      setAttempts((latest) => ({ ...latest, keys: new Map(latest.keys).set(id, key) }));

      return key;
    },
    [current.keys],
  );

  /** 行の停止を送ったことを、送った順に積む。 */
  const markSent = useCallback((id: CampaignId) => {
    setAttempts((latest) => ({ ...latest, sent: [...latest.sent, id] }));
  }, []);

  return { keyFor, markSent, answered: current.answered };
}
