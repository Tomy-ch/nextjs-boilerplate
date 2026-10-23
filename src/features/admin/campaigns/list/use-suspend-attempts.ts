"use client";

import { useCallback, useState } from "react";

import type { CampaignId } from "@/model/campaign/campaign";
import { newIdempotencyKey, settlesSubmission } from "@/model/idempotency-key";

import type { RowActionAnswer } from "../../use-row-action-state";
import type { SuspendCampaignState } from "./form-state";

/**
 * 停止する行ごとに、試みの冪等キーを渡す。
 *
 * @remarks
 * 結果が定まらない失敗の後に同じ行を選び直すと、同じキーを返します。応答が試みを確定させたら
 * （`settlesSubmission`）、その結果が答えた行のキーを手放します。
 *
 * @param answer - 直近の結果と、それが答えた行
 * @returns 行の識別子から、その行の試みのキーを返す関数
 */
export function useSuspendAttempts(
  answer: RowActionAnswer<SuspendCampaignState>,
): (id: CampaignId) => string {
  const [keys, setKeys] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [seenAnswer, setSeenAnswer] = useState(answer);
  let current = keys;

  if (seenAnswer !== answer) {
    setSeenAnswer(answer);

    if (answer.row !== null && settlesSubmission(answer.result) && keys.has(answer.row)) {
      const next = new Map(keys);

      next.delete(answer.row);
      current = next;
      setKeys(next);
    }
  }

  return useCallback(
    (id: CampaignId) => {
      const key = current.get(id) ?? newIdempotencyKey();

      setKeys((latest) => new Map(latest).set(id, key));

      return key;
    },
    [current],
  );
}
