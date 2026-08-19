"use client";

import { create } from "zustand";

/** 書きかけがあるという申告と、その操作。 */
export type UnsavedChangesStore = {
  /**
   * まだ送っていない書きかけがあるか。
   *
   * 何が書きかけかは持たない。判断するのは入力を持つ画面で、器はその真偽だけを見て確認を挟む。
   */
  hasUnsavedChanges: boolean;
  /** 書きかけの有無を申告する。 */
  setUnsavedChanges: (hasUnsavedChanges: boolean) => void;
};

/**
 * 書きかけがあるかという横断 client 状態。
 *
 * @remarks
 * **申告する側と、それを使う側の層が違うため store に置きます**
 * （[0023](../../docs/adr/0023-stores-kernel.md)）。申告するのは入力を持つ画面（feature）で、
 * 確認を挟むのは画面の外にある link を含む器（app / components）です。page から layout へ
 * props は渡せないので、両者を繋ぐ経路がここになります。
 *
 * **中身は持ちません。** 何が書きかけかは画面の関心で、器は真偽だけを知れば足ります。
 *
 * 永続化しません。リロードすれば書きかけは失われており、申告だけが残ると出る理由の無い確認が
 * 出ます。
 */
export const useUnsavedChangesStore = create<UnsavedChangesStore>((set) => ({
  hasUnsavedChanges: false,

  setUnsavedChanges: (hasUnsavedChanges) => set({ hasUnsavedChanges }),
}));
