"use client";

import { useActionState, useState } from "react";

import { idleActionState } from "@/model/action-state";
import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";
import { placeOrderAction } from "../../../actions";
import type { PlaceOrderFormState } from "../../../form-state";
import { PlaceOrderError, PlaceOrderSubmit } from "../place-order-submit/place-order-submit";

/** `PlaceOrderForm` の props。 */
export type PlaceOrderFormProps = {
  /** この画面の確定 1 回ぶんを表す鍵。 */
  idempotencyKey: string;
  /** 確定できる明細があるか。無ければ押せない。 */
  orderable: boolean;
};

const LABEL = "注文を確定する";

/**
 * 購入をそのまま確定する操作。
 *
 * @remarks
 * **鍵は画面が組んだ時点の値を送ります。** 押すたびに作り直すと、二重に押したぶんだけ購入が
 * 増えます。同じ画面から何度送っても同じ鍵になるのが、この隠し項目の役目です。引き下げての
 * 再取得を挟んでも変わりません。
 *
 * 金額が変わっている場合はこの姿を使いません。確かめてから送る
 * [`PriceChangeConfirm`](../price-change-confirm/price-change-confirm.tsx) が受け持ち、
 * どちらを出すかは呼び出し元が選びます。
 */
export function PlaceOrderForm({
  idempotencyKey: initialIdempotencyKey,
  orderable,
}: PlaceOrderFormProps) {
  // 鍵は最初に受け取ったものを使い続ける（理由は `model/idempotency-key.ts`）。
  const [idempotencyKey] = useState(initialIdempotencyKey);
  const [state, formAction] = useActionState<PlaceOrderFormState, FormData>(
    placeOrderAction,
    idleActionState(),
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input name={IDEMPOTENCY_KEY_FIELD} type="hidden" value={idempotencyKey} />
      <PlaceOrderSubmit fullWidth label={LABEL} orderable={orderable} />
      <PlaceOrderError state={state} />
    </form>
  );
}
