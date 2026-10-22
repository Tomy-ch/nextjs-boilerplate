"use client";

import { type SubmitEvent, useCallback, useState } from "react";

/** {@link useEmptyGuard} が返す、空のまま送らせないための組。 */
export type EmptyGuard = {
  /** 空のまま送ろうとしたときに出す文言。出していなければ `null`。 */
  readonly error: string | null;
  /** 文言を消す。入力が変わったときに呼ぶ。 */
  readonly clear: () => void;
  /** `form` の `onSubmit` に渡す。空白だけの入力なら送らずに文言を出す。 */
  readonly refuseEmpty: (event: SubmitEvent<HTMLFormElement>) => void;
};

/**
 * 必須の欄が空のまま送られないようにする。
 *
 * @remarks
 * 送信の操作は押せるまま、押された時点で止め、欄に紐づける文言を返します。送信を止めても
 * Server Action 側の検証は省けません。
 *
 * @param value - いまの入力
 * @param message - 空のまま送ろうとしたときの文言
 * @returns 文言・消し方・`onSubmit` の組
 *
 * @example
 * ```tsx
 * import { type ChangeEvent, useState } from "react";
 *
 * import { useEmptyGuard } from "@/components/use-empty-guard";
 *
 * function NoteForm({ action }: { action: (formData: FormData) => void }) {
 *   const [note, setNote] = useState("");
 *   const guard = useEmptyGuard(note, "メモを入力してください。");
 *
 *   return (
 *     <form action={action} onSubmit={guard.refuseEmpty}>
 *       <textarea
 *         aria-invalid={guard.error === null ? undefined : true}
 *         name="note"
 *         onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
 *           setNote(event.target.value);
 *           guard.clear();
 *         }}
 *         value={note}
 *       />
 *       {guard.error === null ? null : <p>{guard.error}</p>}
 *       <button type="submit">送る</button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useEmptyGuard(value: string, message: string): EmptyGuard {
  const [error, setError] = useState<string | null>(null);

  const clear = useCallback(() => {
    setError(null);
  }, []);

  const refuseEmpty = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      if (value.trim() === "") {
        event.preventDefault();
        setError(message);
      }
    },
    [message, value],
  );

  return { error, clear, refuseEmpty };
}
