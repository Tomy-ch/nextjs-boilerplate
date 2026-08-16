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
  /** 取り除いた明細。取り除いた順に並ぶ。 */
  removed: readonly RemovedCartLine[];
  /** 画面が見せていた並び。取り除いた明細も、消える前に居た場所に残る。 */
  order: readonly string[];
  /** 取り除いたことと、そのとき画面が並べていた順を知らせる。 */
  notify: (line: RemovedCartLine, displayedOrder: readonly string[]) => void;
};

const RemovalNoticeContext = createContext<RemovalNotice | null>(null);

/** 今まさに画面が並べている順。取り除いた時点の姿を覚えるために読む。 */
const DisplayedOrderContext = createContext<readonly string[]>([]);

/**
 * 取り除いた明細と、画面が見せていた並びを覚えておく器。
 *
 * @remarks
 * **どちらもサーバが持たない情報です。** 取り除いた明細はサーバの応答から既に消えており、並びは
 * 画面の見え方そのものです。サーバの応答から直前の姿を組み立て直すのではなく、見せていた側が
 * そのまま覚えます（[0060](../../../../../docs/adr/0060-state-management.md) の線引き）。
 *
 * **1 件ずつではなく溜めます。** 続けて 2 件取り除いたときに先の 1 件を忘れると、戻す手段が
 * 消えた側だけ失われます。同じ商品を取り除き直した場合は、数量が変わっているため古い記録を捨てます。
 *
 * **カートの器よりも外に置きます。** 最後の 1 件を取り除くとカートの表示自体が空の姿へ変わるため、
 * 中身の側に持つとその切り替わりで記憶ごと失われます。
 *
 * `stores` へは置きません。これはカートの中だけで閉じる状態で、他の feature は読みません
 * （[0023](../../../../../docs/adr/0023-stores-kernel.md) の受入基準）。
 */
export function CartRemovalNoticeProvider({ children }: { children: ReactNode }) {
  const [removed, setRemoved] = useState<readonly RemovedCartLine[]>([]);
  const [order, setOrder] = useState<readonly string[]>([]);

  const notify = useCallback((line: RemovedCartLine, displayedOrder: readonly string[]) => {
    setRemoved((current) => [...current.filter((it) => it.productId !== line.productId), line]);
    setOrder((current) => {
      // 戻された明細は画面から出ていくため、覚えている並びからも落とす。残すのは今も並んでいるものと、
      // 取り除いたばかりのものだけ。
      const kept = current.filter((id) => displayedOrder.includes(id) || id === line.productId);

      return [...kept, ...displayedOrder.filter((id) => !kept.includes(id))];
    });
  }, []);

  const value = useMemo<RemovalNotice>(
    () => ({ removed, order, notify }),
    [removed, order, notify],
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

/**
 * 今まさに画面が並べている順を配る。
 *
 * @remarks
 * 並びを知っているのは並べている器だけです。行 1 つずつに順を持たせると、行の数だけ同じ一覧を
 * 運ぶことになります。
 */
export function CartDisplayedOrder({
  order,
  children,
}: {
  order: readonly string[];
  children: ReactNode;
}) {
  return <DisplayedOrderContext.Provider value={order}>{children}</DisplayedOrderContext.Provider>;
}

/** 今まさに画面が並べている順。器の外では空。 */
export function useDisplayedOrder(): readonly string[] {
  return useContext(DisplayedOrderContext);
}

/**
 * いま戻せる明細。
 *
 * @remarks
 * 判定は**カートの中身から導きます**。取り除いた商品がまだ居るなら、削除が通らなかったか、既に
 * 戻したかのどちらかです。取り下げの合図を操作の側から受け取らないのは、合図を送る部品（削除の
 * ボタン）が送った直後に消えるためです。
 *
 * @param presentProductIds - いまカートに入っている商品
 */
export function usePendingRemovals(
  presentProductIds: readonly string[],
): readonly RemovedCartLine[] {
  const notice = useCartRemovalNotice();
  const removed = notice?.removed;

  return useMemo(
    () => (removed ?? []).filter((line) => !presentProductIds.includes(line.productId)),
    [removed, presentProductIds],
  );
}

/** `CartRemovalNotice` の props。 */
export type CartRemovalNoticeProps = {
  /** 戻せる明細 1 件。 */
  removed: RemovedCartLine;
};

/**
 * 取り除いた明細を戻せることを伝える表示。
 *
 * @remarks
 * **置き場所は持ちません。** 明細の中では消えた行の位置に差し込まれ、明細が 1 つも無い姿では
 * 単独で出ます。位置を決めるのは呼び出し元です。
 *
 * 出すのは 1 行の削除だけです。カートを空にする操作は確認を挟んでおり、取り消しを二重に置くと
 * 「確認したのに戻せる」と「戻せるから確認は要らない」のどちらとも取れます。
 *
 * **押しても自分から消えません。** 送信の途中で自分を畳むと、投げ終える前に form ごと居なくなり、
 * 戻す要求が届きません。消えるのは明細がカートへ戻ったときで、判定は {@link usePendingRemovals}
 * が持ちます。
 *
 * 戻すのは数量の設定です。取り除いた時点の数量をそのまま入れ直すため、専用の口を持ちません。
 */
export function CartRemovalNotice({ removed }: CartRemovalNoticeProps) {
  const [, formAction] = useActionState<CartActionState, FormData>(
    setCartItemQuantityAction,
    idleActionState(),
  );

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
      data-slot="cart-removal-notice"
      role="status"
    >
      <p className="min-w-0 text-sm">{`${removed.name} を削除しました`}</p>
      <form action={formAction}>
        <input name="productId" type="hidden" value={removed.productId} />
        <input name="quantity" type="hidden" value={removed.quantity} />
        <Button size="sm" type="submit" variant="outline">
          <Undo2Icon aria-hidden="true" className="size-4" />
          カートに戻す
        </Button>
      </form>
    </div>
  );
}

/** `CartRemovalNoticeList` の props。 */
export type CartRemovalNoticeListProps = {
  /** いまカートに入っている商品。戻せるかどうかの判定に使う。 */
  presentProductIds: readonly string[];
};

/**
 * 戻せる明細をまとめて出す。
 *
 * @remarks
 * 明細が 1 つも無い姿で使います。並べる相手が無いため位置を持てず、取り除いた順に積みます。
 * 明細が残っている場合は `CartLineList` が並びの中へ差し込みます。
 */
export function CartRemovalNoticeList({ presentProductIds }: CartRemovalNoticeListProps) {
  const pending = usePendingRemovals(presentProductIds);

  if (pending.length === 0) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {pending.map((line) => (
        <CartRemovalNotice key={line.productId} removed={line} />
      ))}
    </div>
  );
}
