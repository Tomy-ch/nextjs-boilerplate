"use client";

import { useCallback, useState } from "react";

import type { CampaignId } from "@/model/campaign/campaign";
import { newIdempotencyKey, settlesSubmission } from "@/model/idempotency-key";

import type { SuspendCampaignState } from "./form-state";

/** 行ごとの試みのキーと、直近に確認を開いた行。 */
type Attempts = {
  readonly keys: ReadonlyMap<CampaignId, string>;
  readonly last: CampaignId | null;
};

/**
 * 停止する行ごとに、試みの冪等キーを渡す。
 *
 * @remarks
 * 結果が定まらない失敗の後に同じ行を選び直すと、同じキーを返します。応答が試みを確定させたら
 * （`settlesSubmission`）、その行のキーを手放します。
 *
 * **結果は、直近に確認を開いた行のものとして扱います。** 送信は、開いた確認からしか出ないため
 * です。
 *
 * @param state - 直近の送信が返した結果
 * @returns 行の識別子から、その行の試みのキーを返す関数
 */
export function useSuspendAttempts(state: SuspendCampaignState): (id: CampaignId) => string {
  const [attempts, setAttempts] = useState<Attempts>(() => ({ keys: new Map(), last: null }));
  const [seenState, setSeenState] = useState(state);

  if (seenState !== state) {
    setSeenState(state);

    if (attempts.last !== null && settlesSubmission(state)) {
      const keys = new Map(attempts.keys);

      keys.delete(attempts.last);
      setAttempts({ keys, last: null });
    }
  }

  return useCallback(
    (id: CampaignId) => {
      const key = attempts.keys.get(id) ?? newIdempotencyKey();

      setAttempts((current) => ({ keys: new Map(current.keys).set(id, key), last: id }));

      return key;
    },
    [attempts.keys],
  );
}
