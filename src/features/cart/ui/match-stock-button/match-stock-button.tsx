"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/design-system/action/button/button";
import { idleActionState } from "@/model/action-state";

import { type CartActionState, setCartItemQuantityAction } from "../../actions";
import { CartActionError } from "../action-error/action-error";

/** `CartMatchStockButton` の props。 */
export type CartMatchStockButtonProps = {
  /** 対象の商品。 */
  productId: string;
  /** いま買える数。この数量へ合わせる。 */
  availableQuantity: number;
  /** 対象の名前。操作の読み上げを行ごとに区別するために使う。 */
  label: string;
};

/** 送信部。`useFormStatus` は form の子でしか状態を読めないため切り出している。 */
function MatchSubmit({ availableQuantity, label }: { availableQuantity: number; label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      aria-label={`${label} を在庫の ${availableQuantity} 個に合わせる`}
      disabled={pending}
      name="quantity"
      size="sm"
      type="submit"
      value={availableQuantity}
      variant="outline"
    >
      {`在庫の ${availableQuantity} 個に合わせる`}
    </Button>
  );
}

/**
 * 数量を、いま買える数まで下げる操作。
 *
 * @remarks
 * **在庫が足りない明細にだけ出します。** 足りているうちは押しても結果が変わらず、在庫が 1 つも
 * 無い明細では合わせる先がありません（そちらで取れる行動は取り除くことです）。
 *
 * 数量を 1 つずつ減らす操作と別に置くのは、**利用者が知りたいのが「いくつなら買えるか」だから**
 * です。事情として届いた数がそのまま操作の値になるので、何回押すかを数えずに済みます。
 *
 * 送る数量はボタン自身が持ちます。設定（絶対値）を送る契約なので、押した時点の在庫がそのまま
 * 送る値になります。
 */
export function CartMatchStockButton({
  productId,
  availableQuantity,
  label,
}: CartMatchStockButtonProps) {
  const [state, formAction] = useActionState<CartActionState, FormData>(
    setCartItemQuantityAction,
    idleActionState(),
  );

  return (
    <div className="flex flex-col gap-1">
      <form action={formAction}>
        <input name="productId" type="hidden" value={productId} />
        <MatchSubmit availableQuantity={availableQuantity} label={label} />
      </form>
      <CartActionError state={state} title="数量を合わせられませんでした" />
    </div>
  );
}
