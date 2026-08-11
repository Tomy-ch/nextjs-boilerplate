"use client";

import { create } from "zustand";

/**
 * カートに入っている 1 行。
 *
 * @remarks
 * 表示に要る値は追加した時点のものを持ち、再取得しません
 * （[0023](../../docs/adr/0023-stores-kernel.md) の「選択の記録に含む表示値のスナップショット」）。
 */
export type CartLine = {
  productId: string;
  name: string;
  /** 価格。USD の decimal 文字列のまま持つ。 */
  price: string;
  /** 商品状態の表示名。 */
  statusName: string;
  /** 表示に使う画像 URL。無ければ null。 */
  imageUrl: string | null;
  /**
   * 数量の上限。カートへ入れた時点の在庫数。
   *
   * バックエンドが購入の時点で在庫を再確認するが、在庫を超えた数量はそもそも成立しないため、
   * この store が受け付けない。
   */
  stockQuantity: number;
  quantity: number;
};

/** 追加時に渡す 1 行。数量は store が決める。 */
export type CartLineInput = Omit<CartLine, "quantity">;

/** カートの状態と操作。 */
export type CartStore = {
  lines: readonly CartLine[];
  /**
   * 1 つ追加する。同じ商品が既にあれば行を増やさず数量を上げる。
   *
   * 在庫数に達している行は増えない。在庫が無い商品は追加しない。
   */
  add: (line: CartLineInput) => void;
  /** 数量を指定する。在庫数で頭を打ち、0 以下を指定した場合は行を取り除く。 */
  setQuantity: (productId: string, quantity: number) => void;
  /** 行を取り除く。 */
  remove: (productId: string) => void;
};

/**
 * カートの横断 client 状態。
 *
 * @remarks
 * 商品側の「カートに追加」とカートの表示という別々の feature が同じ状態を読むため、feature 内の
 * local state ではなくこのカーネルに置いています（[0023](../../docs/adr/0023-stores-kernel.md)）。
 *
 * 数量の上限は操作ごとではなくこの store が持ちます。上限の確認を呼び出し側に委ねると、追加・増加・
 * 数量指定という経路の数だけ確認箇所が増え、どれか 1 つを忘れた時点で在庫を超えた状態が成立します。
 *
 * 永続化しません。リロードで空に戻ります。
 */
export const useCartStore = create<CartStore>((set) => ({
  lines: [],

  add: (line) =>
    set((state) => {
      if (line.stockQuantity <= 0) {
        return state;
      }

      const found = state.lines.some((existing) => existing.productId === line.productId);

      return {
        lines: found
          ? state.lines.map((existing) =>
              existing.productId === line.productId
                ? // 在庫だけでなく価格・名前・画像も、追加のたびに渡された新しい値で上書きする。
                  // 古い在庫で頭打ちが決まると、補充された商品を増やせないままになる。
                  { ...line, quantity: Math.min(existing.quantity + 1, line.stockQuantity) }
                : existing,
            )
          : [...state.lines, { ...line, quantity: 1 }],
      };
    }),

  setQuantity: (productId, quantity) =>
    set((state) => ({
      lines:
        quantity <= 0
          ? state.lines.filter((line) => line.productId !== productId)
          : state.lines.map((line) =>
              line.productId === productId
                ? { ...line, quantity: Math.min(quantity, line.stockQuantity) }
                : line,
            ),
    })),

  remove: (productId) =>
    set((state) => ({ lines: state.lines.filter((line) => line.productId !== productId) })),
}));
