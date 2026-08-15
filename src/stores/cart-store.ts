"use client";

import { create } from "zustand";

/** カートの表示に関する要求と、その操作。 */
export type CartStore = {
  /**
   * 中身を見たいという要求。
   *
   * 要求が表示に出るかは器が決める。脇に常設できる幅では中身が常に見えているため、この値を見ません。
   */
  isOpen: boolean;
  /** 中身を見たいかどうかを指定する。 */
  setOpen: (isOpen: boolean) => void;
};

/**
 * カートを開いているかという横断 client 状態。
 *
 * @remarks
 * 商品側の「カートに追加」がこの要求を立て、カートの器がそれに従うため、feature を跨ぎます
 * （[0023](../../docs/adr/0023-stores-kernel.md)）。
 *
 * **カートの中身は持ちません。** 明細も小計もバックエンドが所有しており、写しをここへ置くと
 * 鮮度の管理が client 側にも生まれます（同 ADR の二重キャッシュ禁止）。
 *
 * 永続化しません。リロードすると閉じた状態から始まります。中身は残ります。
 */
export const useCartStore = create<CartStore>((set) => ({
  isOpen: false,

  setOpen: (isOpen) => set({ isOpen }),
}));
