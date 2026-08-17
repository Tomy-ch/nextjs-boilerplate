"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import { Button } from "@/components/design-system/action/button/button";
import { Spinner } from "@/components/design-system/status/spinner/spinner";
import { idleActionState } from "@/model/action-state";

import { placeOrderAction } from "../../../actions";
import type { PlaceOrderFormState } from "../../../form-state";
import { IDEMPOTENCY_KEY_FIELD } from "../../../idempotency-key";

/** `PlaceOrderForm` の props。 */
export type PlaceOrderFormProps = {
  /** この画面の確定 1 回ぶんを表す鍵。 */
  idempotencyKey: string;
  /** 確定できる明細があるか。無ければ押せない。 */
  orderable: boolean;
};

const LABEL = "注文を確定する";
const PENDING_LABEL = "注文を確定しています";

/**
 * 送信部。
 *
 * @remarks
 * `useFormStatus` は form の子でしか状態を読めないため、別の部品に切り出しています。
 *
 * **送信中は絵柄だけを差し替え、見えている文言は据え置きます。** 文言を伸ばすと器の幅が動き、
 * 脇に貼り付いた集計や下端に固定した帯では周りの位置まで動きます。
 *
 * 送信中は押せなくします。もう一度押しても鍵が同じなので購入は増えませんが、待っているあいだに
 * 押せる操作を残すと、受け付けられたのかどうかが利用者から判りません。
 */
function PlaceOrderSubmit({ orderable }: { orderable: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      aria-label={pending ? PENDING_LABEL : undefined}
      className="w-full"
      disabled={!orderable || pending}
      type="submit"
    >
      {pending ? <Spinner className="size-4" /> : null}
      {LABEL}
    </Button>
  );
}

/**
 * 購入を確定する操作。
 *
 * @remarks
 * **鍵は画面が組んだ時点の値を送ります。** 押すたびに作り直すと、二重に押したぶんだけ購入が
 * 増えます。同じ画面から何度送っても同じ鍵になるのが、この隠し項目の役目です。
 *
 * 失敗はこの操作の隣に出します。確定はこの画面で唯一の送信であり、離れた場所に出すと、
 * 何が通らなかったのかを指せません（[0063](../../../../../docs/adr/0063-mutation-result-notification.md)）。
 *
 * 成立したときの表示を持ちません。成立したら完了画面へ送るためです。
 */
export function PlaceOrderForm({ idempotencyKey, orderable }: PlaceOrderFormProps) {
  const [state, formAction] = useActionState<PlaceOrderFormState, FormData>(
    placeOrderAction,
    idleActionState(),
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input name={IDEMPOTENCY_KEY_FIELD} type="hidden" value={idempotencyKey} />
      <PlaceOrderSubmit orderable={orderable} />
      {state.status === "error" && state.formError !== null ? (
        <FormFeedback
          description={state.formError}
          title="注文を確定できませんでした"
          variant="destructive"
        />
      ) : null}
    </form>
  );
}
