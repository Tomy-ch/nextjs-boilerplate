"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import { Button } from "@/components/design-system/action/button/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/design-system/overlay/alert-dialog/alert-dialog";
import { Spinner } from "@/components/design-system/status/spinner/spinner";
import { idleActionState } from "@/model/action-state";

import { placeOrderAction } from "../../../actions";
import type { PlaceOrderFormState } from "../../../form-state";
import { ACCEPT_PRICE_CHANGE_FIELD, IDEMPOTENCY_KEY_FIELD } from "../../../idempotency-key";
import { CART_PATH } from "../../../paths";

/** `PlaceOrderForm` の props。 */
export type PlaceOrderFormProps = {
  /** この画面の確定 1 回ぶんを表す鍵。 */
  idempotencyKey: string;
  /** 確定できる明細があるか。無ければ押せない。 */
  orderable: boolean;
  /** カートに入れたときから金額が変わった商品の名前。空なら確かめずに送る。 */
  priceChangedNames: readonly string[];
};

const LABEL = "注文を確定する";
const PENDING_LABEL = "注文を確定しています";
const ACCEPT_LABEL = "はい";

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
function PlaceOrderSubmit({
  disabled,
  label,
  fullWidth,
}: {
  disabled: boolean;
  label: string;
  /** 器の幅いっぱいに広げるか。集計の中では主操作として広げ、確かめの footer では文言の幅に収める。 */
  fullWidth: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      aria-label={pending ? PENDING_LABEL : undefined}
      className={fullWidth ? "w-full" : undefined}
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? <Spinner className="size-4" /> : null}
      {label}
    </Button>
  );
}

/** 失敗の表示。成立したら画面が移るため、ここに現れるのは失敗だけ。 */
function PlaceOrderError({ state }: { state: PlaceOrderFormState }) {
  if (state.status !== "error" || state.formError === null) {
    return null;
  }

  return (
    <FormFeedback
      description={state.formError}
      title="注文を確定できませんでした"
      variant="destructive"
    />
  );
}

/**
 * 購入を確定する操作。
 *
 * @remarks
 * **鍵は画面が組んだ時点の値を送ります。** 押すたびに作り直すと、二重に押したぶんだけ購入が
 * 増えます。同じ画面から何度送っても同じ鍵になるのが、この隠し項目の役目です。
 *
 * **金額が変わっているときは、押した先で確かめます。** カートへ入れたときと違う金額で請求される
 * ことを、確定してから知らせるわけにいきません。確かめの中の「はい」だけが承知の合図を載せ、
 * それが無い送信は Server Action の側でも止まります。
 *
 * 確かめは `AlertDialogAction` ではなく form の submit で行います。`AlertDialogAction` は押した
 * 時点で dialog を閉じるため、送信中の表示も失敗の文言も利用者の見ていない場所に出ます。
 *
 * **確かめの中では、どちらの操作も文言の幅に収めます。** 集計の中の確定は画面の主操作なので幅を
 * 占めますが、footer に 2 つ並ぶ操作を片方だけ広げると、短い文言のほうが大きく見えて重さが
 * 文言と合いません。
 *
 * 成立したときの表示を持ちません。成立したら完了画面へ送るためです。
 */
export function PlaceOrderForm({
  idempotencyKey,
  orderable,
  priceChangedNames,
}: PlaceOrderFormProps) {
  const [state, formAction] = useActionState<PlaceOrderFormState, FormData>(
    placeOrderAction,
    idleActionState(),
  );

  if (priceChangedNames.length === 0) {
    return (
      <form action={formAction} className="flex flex-col gap-2">
        <input name={IDEMPOTENCY_KEY_FIELD} type="hidden" value={idempotencyKey} />
        <PlaceOrderSubmit disabled={!orderable} fullWidth label={LABEL} />
        <PlaceOrderError state={state} />
      </form>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="w-full" disabled={!orderable} type="button">
          {LABEL}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input name={IDEMPOTENCY_KEY_FIELD} type="hidden" value={idempotencyKey} />
          <input name={ACCEPT_PRICE_CHANGE_FIELD} type="hidden" value="1" />
          <AlertDialogHeader>
            <AlertDialogTitle>金額が変わっています</AlertDialogTitle>
            <AlertDialogDescription>
              カートに入れたときから金額が変わった商品があります。このまま購入に進んでよろしいですか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="list-disc pl-5 text-sm">
            {priceChangedNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Link href={CART_PATH}>カートを修正する</Link>
            </AlertDialogCancel>
            <PlaceOrderSubmit disabled={!orderable} fullWidth={false} label={ACCEPT_LABEL} />
          </AlertDialogFooter>
          <PlaceOrderError state={state} />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
