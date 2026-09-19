"use client";

import { useEffect } from "react";

/** {@link UnloadGuard} の props。 */
export type UnloadGuardProps = {
  /** 離脱を確認するか。未保存の変更があるあいだ `true` にする。 */
  when: boolean;
};

/**
 * 未保存のまま画面を離れようとしたときに、browser 標準の確認を出す client island。
 *
 * @remarks
 * `beforeunload` を登録するだけで、何も描画しない。抑止できるのは **リロード・タブや window を
 * 閉じる操作・外部サイトへの遷移** の 3 つで、いずれも browser が離脱の直前に確認を出す。
 *
 * 確認の文言と見た目は browser が持ち、変更できない。仕様上 `beforeunload` のメッセージは
 * 無視されるため、この部品は文言を受け取らない。「何が失われるか」を伝えるのは画面側の役割で、
 * 未保存であることは form の近くに表示する。
 *
 * **アプリ内の遷移は抑止しない。** Next.js の App Router は client 側の遷移を止める API を
 * 持たないため、`Link` による遷移は `beforeunload` を発火させない。そこは `NavigationGuard` が
 * 扱う。browser の戻る / 進むはどちらでも塞げない。
 *
 * 未保存かどうかの判定、保存処理、フォームの値は持たない。呼び出し元が `when` として渡す。
 *
 * @example
 * ```tsx
 * <UnloadGuard when={isDirty} />
 * ```
 *
 * @param props.when - 離脱を確認するか。
 *
 * @see Storybook `Navigation/UnloadGuard`
 */
export function UnloadGuard({ when }: UnloadGuardProps) {
  useEffect(() => {
    if (!when) return;

    const confirmUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener("beforeunload", confirmUnload);

    return () => window.removeEventListener("beforeunload", confirmUnload);
  }, [when]);

  return null;
}
