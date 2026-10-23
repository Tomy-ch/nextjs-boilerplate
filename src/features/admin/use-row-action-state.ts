"use client";

import { useActionState } from "react";

import type { ActionState } from "@/model/action-state";

/** 行に対する操作の結果と、それが答えた行。 */
export type RowActionAnswer<S> = {
  /** 結果が答えた行の識別子。まだ何も送っていなければ null。 */
  readonly row: string | null;
  /** 操作が返した結果。 */
  readonly result: S;
};

/**
 * 行に対する操作を送り、結果をそれが答えた行とともに持つ。
 *
 * @remarks
 * **結果は、送った form が載せていた行の識別子を連れて返ります。** 送信中に確認を閉じて別の行を
 * 開けるため、届いた結果がいま開いている行のものとは限りません。送った順の記録で対応づけると、
 * React が結果をまとめて描いたときにずれます。
 *
 * 操作そのものの契約は変えません。行の識別子は送った form から読みます。
 *
 * @typeParam S - 操作が返す結果の型
 * @param action - 行に対する操作
 * @param initial - まだ何も送っていないときの結果
 * @param rowField - 送る form のうち、行の識別子を載せる field の名前
 * @returns 結果と答えた行、送信の口
 */
export function useRowActionState<S extends ActionState<unknown>>(
  action: (state: S, formData: FormData) => Promise<S>,
  initial: S,
  rowField: string,
): [RowActionAnswer<S>, (formData: FormData) => void] {
  return useActionState<RowActionAnswer<S>, FormData>(
    async (previous, formData) => {
      const row = formData.get(rowField);

      return {
        row: typeof row === "string" ? row : null,
        result: await action(previous.result, formData),
      };
    },
    { row: null, result: initial },
  );
}
