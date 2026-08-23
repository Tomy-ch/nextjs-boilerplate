"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import { Button } from "@/components/design-system/action/button/button";
import type { ButtonVariant } from "@/components/design-system/action/button/button.definition";
import { BUTTON_VARIANT } from "@/components/design-system/action/button/button.definition";
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
import { ErrorKind } from "@/errors/error-kind";

import { PURCHASE_TRANSITION_FORM_NAMES } from "../../../form-names";
import type { PurchaseTransitionState } from "../../../form-state";

/** `PurchaseTransitionButton` の props。 */
export type PurchaseTransitionButtonProps = {
  /** 状態を進める対象の購入。 */
  purchaseCode: string;
  /** 送信先。結果は外側が受ける。 */
  formAction: (formData: FormData) => void;
  /** 操作の名前。確認を開くボタンと、確認の中の実行ボタンが同じ名前を持つ。 */
  label: string;
  /** 待っているあいだの名前。 */
  pendingLabel: string;
  /** 確認の見出し。 */
  confirmTitle: string;
  /** 確認の本文。何が起きるかと、戻せるかどうかを書く。 */
  confirmDescription: string;
  /** 直前の送信の結果。通らなかったことを、確認を開いたまま伝えるために読む。 */
  state: PurchaseTransitionState;
  /** 通らなかったときの見出し。 */
  failureTitle: string;
  /** 読み込み直す行き先。状態で拒まれたときだけ添える。 */
  reloadHref: string;
  /**
   * 確認を開く操作の見た目。
   *
   * @remarks
   * **並んだ操作の中でどれを主に見せるかを表します。** 押した先に起きることの重さではありません。
   */
  variant?: ButtonVariant;
  /**
   * 確認の中の実行操作の見た目。
   *
   * @remarks
   * **こちらが起きることの重さを表します。** 確定するのはこのボタンなので、戻せない操作はここで
   * 赤く出します。開く側を静かにしても、確定の瞬間には必ず目に入ります。省略すると開く側に揃います。
   */
  confirmVariant?: ButtonVariant;
};

/**
 * 確認の中の実行ボタン。
 *
 * @remarks
 * `useFormStatus` は `form` の子でしか送信状態を読めないため、別の部品に切り出しています。
 */
function TransitionSubmit({
  label,
  pendingLabel,
  variant,
}: {
  label: string;
  pendingLabel: string;
  variant: ButtonVariant;
}) {
  const { pending } = useFormStatus();

  return (
    <Button pending={pending} pendingLabel={pendingLabel} type="submit" variant={variant}>
      {label}
    </Button>
  );
}

/**
 * 購入の状態を 1 つ進める操作。押すと確認を開く。
 *
 * @remarks
 * **確認を挟みます。** キャンセルは戻せず、支払いは金銭の意味を持ちます。`AlertDialog` は閉じる
 * 操作を明示的に選ばせるので、背景を押しただけでは閉じません。
 *
 * 確認は `AlertDialogAction` ではなく form の submit で行います。`AlertDialogAction` は押した
 * 時点で dialog を閉じるため、送信中の表示が利用者の見ていない場所に出ます。
 *
 * **通らなかったことは確認の中で伝えます。** 送信しても確認は開いたままなので、外へ出すと利用者が
 * 見ていない場所に文言が出ます。状態で拒まれたときの読み込み直す導線も同じ場所に添えます。分類で
 * 見分けるのは、文言を合図にすると文言を直した瞬間に出し分けが黙って壊れるためです。
 *
 * **成立したことは伝えません。** 進んだ購入ではこの操作そのものが出なくなり、確認ごと画面から
 * 消えます。成立の知らせは残る側（操作が並ぶ段）が持ちます。
 */
export function PurchaseTransitionButton({
  purchaseCode,
  formAction,
  label,
  pendingLabel,
  confirmTitle,
  confirmDescription,
  state,
  failureTitle,
  reloadHref,
  variant = BUTTON_VARIANT.DEFAULT,
  confirmVariant = variant,
}: PurchaseTransitionButtonProps) {
  const failed = state.status === "error" && state.formError !== null;
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant}>{label}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={formAction}>
          <input
            name={PURCHASE_TRANSITION_FORM_NAMES.purchaseCode}
            type="hidden"
            value={purchaseCode}
          />
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          {failed ? (
            <div className="mt-4">
              <FormFeedback
                description={state.formError}
                title={failureTitle}
                variant="destructive"
              >
                {state.kind === ErrorKind.CONFLICT ? (
                  <Button asChild size="sm" variant={BUTTON_VARIANT.OUTLINE}>
                    <Link href={reloadHref}>読み込み直す</Link>
                  </Button>
                ) : null}
              </FormFeedback>
            </div>
          ) : null}
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel type="button">やめる</AlertDialogCancel>
            <TransitionSubmit label={label} pendingLabel={pendingLabel} variant={confirmVariant} />
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
