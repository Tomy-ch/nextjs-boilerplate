"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/design-system/action/button/button";
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
} from "@/components/design-system/action/button/button.definition";
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
import { idleActionState } from "@/model/action-state";

import { type CartActionState, clearCartAction } from "../../actions";
import { CartActionError } from "../action-error/action-error";

const CONFIRM_LABEL = "カートを空にする";
const PENDING_LABEL = "空にしています…";

/**
 * 確認 dialog の中の実行ボタン。
 *
 * @remarks
 * 送信中の見せ方は `Button`（`pending`）が持ちます。
 */
function ClearSubmit() {
  const { pending } = useFormStatus();

  return (
    <Button
      pending={pending}
      pendingLabel={PENDING_LABEL}
      type="submit"
      variant={BUTTON_VARIANT.DESTRUCTIVE}
    >
      {CONFIRM_LABEL}
    </Button>
  );
}

/**
 * カートの明細をすべて取り除く操作。
 *
 * @remarks
 * 確認を挟みます。1 行の削除と違って戻すには入れ直す商品を思い出す必要があり、押し間違いの
 * 代償が行数に比例するためです。
 *
 * 確認は `AlertDialogAction` ではなく form の submit で行います。`AlertDialogAction` は押した
 * 時点で dialog を閉じるため、送信中の表示も失敗の文言も利用者の見ていない場所に出ます。
 *
 * カートそのものは残ります。空のカートは正当な状態で、利用者の同一性も切れません。
 */
export function CartClearButton() {
  const [state, formAction] = useActionState<CartActionState, FormData>(
    clearCartAction,
    idleActionState(),
  );

  return (
    <div className="flex flex-col gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button className="w-full" size={BUTTON_SIZE.SMALL} variant={BUTTON_VARIANT.GHOST}>
            {CONFIRM_LABEL}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <form action={formAction}>
            <AlertDialogHeader>
              <AlertDialogTitle>カートを空にしますか？</AlertDialogTitle>
              <AlertDialogDescription>
                入っている商品をすべて取り除きます。元に戻すには、同じ商品をもう一度カートへ
                入れ直すことになります。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6">
              <AlertDialogCancel type="button">キャンセル</AlertDialogCancel>
              <ClearSubmit />
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
      <CartActionError state={state} title="カートを空にできませんでした" />
    </div>
  );
}
