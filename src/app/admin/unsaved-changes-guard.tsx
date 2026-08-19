"use client";

import type { ReactNode } from "react";

import { NavigationGuard } from "@/components/app-starter/navigation-guard/navigation-guard";
import { UnloadGuard } from "@/components/app-starter/unload-guard/unload-guard";
import { useUnsavedChangesStore } from "@/stores/unsaved-changes-store";

/** `UnsavedChangesGuard` の props。 */
export type UnsavedChangesGuardProps = {
  /** 見張る範囲。この配下の link click を傍受する。 */
  children: ReactNode;
};

const TITLE = "移動しますか？";
const DESCRIPTION = "編集中の内容は保存されませんが移動しますか？";

/**
 * 書きかけがあるあいだ、画面を離れる操作を確認する器。
 *
 * @remarks
 * **書きかけかどうかを自分では決めません。** 判断するのは入力を持つ画面で、ここは申告
 * （`stores/unsaved-changes-store`）を読むだけです。器の側が判断すると、どの入力を数えるかを
 * 器が知ることになります。
 *
 * 器の階層に置くのは、離れる操作の起点が**画面の外**にあるためです。パンくずも脇の一覧も画面
 * より上にあり、画面の内側から包めません。
 *
 * `components` ではなく app 層に置くのは、横断 client 状態を読んでよいのがこの層だからです
 * （`architecture.ts`）。部品は状態の出どころを知らないまま組めることが条件で、store を読んだ
 * 時点でその条件から外れます。
 *
 * アプリ内の移動とリロード / タブを閉じるは別の経路なので、2 つの部品を併せて使います。
 * browser の戻る / 進むはどちらでも塞げません（`NavigationGuard` の README）。
 */
export function UnsavedChangesGuard({ children }: UnsavedChangesGuardProps) {
  const hasUnsavedChanges = useUnsavedChangesStore((state) => state.hasUnsavedChanges);

  return (
    <NavigationGuard description={DESCRIPTION} title={TITLE} when={hasUnsavedChanges}>
      <UnloadGuard when={hasUnsavedChanges} />
      {children}
    </NavigationGuard>
  );
}
