"use client";

import { Trash2Icon } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/design-system/action/button/button";
import { idleActionState } from "@/model/action-state";

import { type CartActionState, removeCartItemAction } from "../../actions";
import { CartActionError } from "../action-error/action-error";

/** `CartRemoveButton` の props。 */
export type CartRemoveButtonProps = {
  /** 取り除く対象の商品。 */
  productId: string;
  /** 対象の名前。操作の読み上げを行ごとに区別するために使う。 */
  label: string;
};

/** 送信中は押せなくする実行部。`useFormStatus` は form の子でしか状態を読めない。 */
function RemoveSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      aria-label={`${label} を削除する`}
      disabled={pending}
      size="sm"
      type="submit"
      variant="ghost"
    >
      <Trash2Icon aria-hidden="true" className="size-4" />
    </Button>
  );
}

/**
 * 明細 1 行をカートから取り除く操作。
 *
 * @remarks
 * 確認を挟みません。取り除いた商品は同じ画面からすぐ入れ直せるうえ、カートは購入の控えであって
 * 取り消せない操作ではないためです。**カートを空にする操作とはここが違います**。
 *
 * 買えない明細にも出します。公開が止まった商品こそ取り除きたく、契約もこの操作だけは商品の
 * 状態を問いません。
 */
export function CartRemoveButton({ productId, label }: CartRemoveButtonProps) {
  const [state, formAction] = useActionState<CartActionState, FormData>(
    removeCartItemAction,
    idleActionState(),
  );

  return (
    <div className="flex flex-col gap-1" data-slot="cart-remove-button">
      <form action={formAction}>
        <input name="productId" type="hidden" value={productId} />
        <RemoveSubmit label={label} />
      </form>
      <CartActionError state={state} title="削除できませんでした" />
    </div>
  );
}
