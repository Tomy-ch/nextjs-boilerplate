"use client";

import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";
import { usePlaceOrderState } from "../place-order-state/place-order-state";
import { PlaceOrderError, PlaceOrderSubmit } from "../place-order-submit/place-order-submit";

/** `PlaceOrderForm` の props。 */
export type PlaceOrderFormProps = {
  /** 確定できる明細があるか。無ければ押せない。 */
  orderable: boolean;
};

const LABEL = "注文を確定する";

/**
 * 購入をそのまま確定する操作。
 *
 * @remarks
 * **鍵も送信の状態も画面が 1 つだけ持ちます**（`../place-order-state`）。押すたびに鍵を作り直すと
 * 二重に押したぶんだけ購入が増え、状態を姿ごとに持つと帯と脇で待ち方が食い違います。
 *
 * 金額が変わっている場合はこの姿を使いません。確かめてから送る
 * [`PriceChangeConfirm`](../price-change-confirm/price-change-confirm.tsx) が受け持ち、
 * どちらを出すかは呼び出し元が選びます。
 */
export function PlaceOrderForm({ orderable }: PlaceOrderFormProps) {
  const { formAction, idempotencyKey } = usePlaceOrderState();

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input name={IDEMPOTENCY_KEY_FIELD} type="hidden" value={idempotencyKey} />
      <PlaceOrderSubmit fullWidth label={LABEL} orderable={orderable} />
      <PlaceOrderError />
    </form>
  );
}
