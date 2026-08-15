"use client";

import { Undo2Icon } from "lucide-react";
import type { ReactNode } from "react";
import { createContext, useActionState, useCallback, useContext, useMemo, useState } from "react";

import { Button } from "@/components/design-system/action/button/button";
import { idleActionState } from "@/model/action-state";

import { type CartActionState, setCartItemQuantityAction } from "../../actions";

/** 取り除いた明細のうち、戻すために要る値。 */
export type RemovedCartLine = {
  productId: string;
  /** 利用者に見せる名前。 */
  name: string;
  /** 取り除いた時点の数量。戻すときはこの数量で入れ直す。 */
  quantity: number;
};

type RemovalNotice = {
  removed: RemovedCartLine | null;
  notify: (line: RemovedCartLine) => void;
  clear: () => void;
};

const RemovalNoticeContext = createContext<RemovalNotice | null>(null);

/**
 * 直近に取り除いた明細を覚えておく器。
 *
 * @remarks
 * 覚える場所が行の外にあるのは、**取り除いた行がその瞬間に消えるため**です。行の中に持つと、
 * 取り消しを出したい相手と一緒に居なくなります。
 *
 * `stores` へは置きません。これはカートの中だけで閉じる状態で、他の feature は読みません
 * （[0023](../../../../../docs/adr/0023-stores-kernel.md) の受入基準）。
 */
export function CartRemovalNoticeProvider({ children }: { children: ReactNode }) {
  const [removed, setRemoved] = useState<RemovedCartLine | null>(null);
  const clear = useCallback(() => setRemoved(null), []);
  const value = useMemo<RemovalNotice>(
    () => ({ removed, notify: setRemoved, clear }),
    [removed, clear],
  );

  return <RemovalNoticeContext.Provider value={value}>{children}</RemovalNoticeContext.Provider>;
}

/**
 * 取り消しの器へ知らせる口。
 *
 * @remarks
 * 器の外でも操作は成立します（器を持たない場所に置いた 1 行だけの story など）。その場合は
 * 取り消しが出ないだけで、削除そのものは通ります。
 *
 * @returns 器が無ければ null
 */
export function useCartRemovalNotice(): RemovalNotice | null {
  return useContext(RemovalNoticeContext);
}

/** `CartRemovalNotice` の props。 */
export type CartRemovalNoticeProps = {
  /** いまカートに入っている商品。取り除けたかどうかの判定に使う。 */
  presentProductIds: readonly string[];
};

/**
 * 直近に取り除いた明細を戻せることを伝える表示。
 *
 * @remarks
 * 出すのは 1 行の削除だけです。カートを空にする操作は確認を挟んでおり、取り消しを二重に置くと
 * 「確認したのに戻せる」と「戻せるから確認は要らない」のどちらとも取れます。
 *
 * **明細がまだカートに居るなら出しません。** 削除が通らなかった場合と、取り消しで戻した直後が
 * これに当たります。取り下げの合図を操作の側から受け取るのではなく、カートの中身から導きます。
 *
 * 戻すのは数量の設定です。取り除いた時点の数量をそのまま入れ直すため、専用の口を持ちません。
 */
export function CartRemovalNotice({ presentProductIds }: CartRemovalNoticeProps) {
  const notice = useCartRemovalNotice();
  const [, formAction] = useActionState<CartActionState, FormData>(
    setCartItemQuantityAction,
    idleActionState(),
  );

  if (
    notice === null ||
    notice.removed === null ||
    presentProductIds.includes(notice.removed.productId)
  ) {
    return null;
  }

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
      data-slot="cart-removal-notice"
      role="status"
    >
      <p className="min-w-0 text-sm">{`${notice.removed.name} を削除しました`}</p>
      <form action={formAction}>
        <input name="productId" type="hidden" value={notice.removed.productId} />
        <input name="quantity" type="hidden" value={notice.removed.quantity} />
        <Button onClick={notice.clear} size="sm" type="submit" variant="outline">
          <Undo2Icon aria-hidden="true" className="size-4" />
          カートに戻す
        </Button>
      </form>
    </div>
  );
}
