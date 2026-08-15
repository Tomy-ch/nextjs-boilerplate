"use client";

import { ShoppingCartIcon } from "lucide-react";
import { useActionState, useCallback } from "react";
import { useFormStatus } from "react-dom";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import { Button } from "@/components/design-system/action/button/button";
import { type ActionState, idleActionState } from "@/model/action-state";
import { useCartStore } from "@/stores/cart-store";

import { addToCartAction } from "./add-to-cart";

/** `AddToCartButton` の props。 */
export type AddToCartButtonProps = {
  /** カートへ入れる商品。 */
  productId: string;
  /** 在庫数。0 なら押せない。 */
  stockQuantity: number;
  /**
   * 一覧の 1 件に添える形で出すか。
   *
   * 既定は画面の主操作としての形で、幅を占めて大きく出す。一覧では 1 件ぶんの枠に他の情報と
   * 並ぶため、内容の幅に収める。小さくしすぎないのは、一覧でも指で押す対象であることが
   * 変わらないためで、`size` は既定より下げない。
   */
  compact?: boolean;
};

const LABEL = "カートに追加";
const PENDING_LABEL = "追加しています…";

/**
 * 送信部。
 *
 * @remarks
 * 押した時点でカートを開きます。結果を待って開くと、往復のあいだ何も起きていないように見えます。
 * 失敗した場合はこのボタンの下に理由が出ます。
 *
 * `useFormStatus` は form の子でしか状態を読めないため、別の部品に切り出しています。
 */
function AddSubmit({ disabled, compact }: { disabled: boolean; compact: boolean }) {
  const { pending } = useFormStatus();
  const setOpen = useCartStore((state) => state.setOpen);
  const open = useCallback(() => setOpen(true), [setOpen]);
  const label = pending ? PENDING_LABEL : LABEL;

  return (
    <Button
      className={compact ? undefined : "w-full lg:w-auto"}
      disabled={disabled || pending}
      onClick={open}
      size={compact ? "default" : "lg"}
      type="submit"
    >
      <ShoppingCartIcon aria-hidden="true" className="size-4" />
      {label}
    </Button>
  );
}

/**
 * 商品をカートへ入れる操作。
 *
 * @remarks
 * カートの中身はバックエンドが持ちます。この部品は入れるよう頼むだけで、入った結果は同じ往復で
 * 描き直される脇の領域と header の点数に現れます。
 *
 * **在庫が無い商品は押せません。** 在庫を超える数量そのものは拒まれず、買えるかどうかの判定は
 * バックエンドが持ちますが、1 つも無いと判っている商品にまで操作を残すと、押しても結果が
 * 変わらない操作が画面に残ります。
 *
 * 画面の下には置かれません。詳細と一覧の両方から使うため、どこへ置くかは呼び出し元が決めます。
 */
export function AddToCartButton({
  productId,
  stockQuantity,
  compact = false,
}: AddToCartButtonProps) {
  const [state, formAction] = useActionState<ActionState<void>, FormData>(
    addToCartAction,
    idleActionState(),
  );

  return (
    <form action={formAction} className={compact ? undefined : "w-full lg:w-auto"}>
      <input name="productId" type="hidden" value={productId} />
      <AddSubmit compact={compact} disabled={stockQuantity <= 0} />
      {state.status === "error" && state.formError !== null ? (
        <FormFeedback
          description={state.formError}
          title="カートに追加できませんでした"
          variant="destructive"
        />
      ) : null}
    </form>
  );
}
