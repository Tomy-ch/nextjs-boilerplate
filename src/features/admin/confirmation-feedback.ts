import type { ActionState, FieldErrors } from "@/model/action-state";

/**
 * 確認の中に出す失敗の文言を返す。
 *
 * @typeParam TState - 確認から送った操作の結果の型
 * @param state - 確認から送った操作の結果
 * @param closes - この結果で確認を閉じるか。閉じる結果の文言は確認の外に出る
 * @returns 確認を閉じない失敗の全体の文言。無ければ空
 */
export function failuresOf<TState extends ActionState<unknown>>(
  state: TState,
  closes: (state: TState) => boolean,
): readonly string[] {
  if (state.status !== "error" || closes(state) || state.formError === null) {
    return [];
  }

  return [state.formError];
}

/**
 * 欄ごとに出す文言を、返った拒否と手元の判定から揃える。
 *
 * @remarks
 * 同じ欄では手元の判定を優先します。打ち直したあとの値に対する判定だからです。送り返された文言は、
 * 手元の判定が何も出していない欄にだけ残ります。
 *
 * @typeParam T - 結果の成功値
 * @typeParam TField - 結果が文言を返す先の欄
 * @param checked - 手元の判定が出した欄ごとの文言。触れた欄のぶんだけ
 * @param state - 表示してよい結果。古くなった結果は null で渡す
 * @returns 欄ごとの最初の文言
 */
export function fieldMessagesOf<T, TField extends string>(
  checked: Readonly<Partial<Record<TField, string>>>,
  state: ActionState<T, TField> | null,
): Partial<Record<TField, string>> {
  const returned: FieldErrors = state?.status === "error" ? (state.fieldErrors ?? {}) : {};
  const firstReturned: Readonly<Record<string, string>> = Object.fromEntries(
    Object.entries(returned).flatMap(([field, list]) =>
      list?.[0] === undefined ? [] : [[field, list[0]]],
    ),
  );

  return { ...firstReturned, ...checked };
}
