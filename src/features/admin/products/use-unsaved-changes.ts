"use client";

import { useEffect } from "react";

import { useUnsavedChangesStore } from "@/stores/unsaved-changes-store";

/**
 * 書きかけがあることを器へ申告する。
 *
 * @remarks
 * 申告は外部の状態（器が読む store）への同期なので effect で行います。画面を離れるときは必ず
 * 取り下げます。取り下げないと、次に開いた画面が何も書いていないのに確認を出します。
 */
export function useUnsavedChanges(hasUnsavedChanges: boolean): void {
  const setUnsavedChanges = useUnsavedChangesStore((state) => state.setUnsavedChanges);

  useEffect(() => {
    setUnsavedChanges(hasUnsavedChanges);

    return () => setUnsavedChanges(false);
  }, [hasUnsavedChanges, setUnsavedChanges]);
}
