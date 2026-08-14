"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import { Button } from "@/components/design-system/action/button/button";
import { BUTTON_VARIANT } from "@/components/design-system/action/button/button.definition";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/design-system/display/card/card";
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

import { withdrawAction } from "../../../actions";
import type { WithdrawFormState } from "../../../form-state";

const CONFIRM_LABEL = "退会する";
const PENDING_LABEL = "退会しています…";

/**
 * 確認 dialog の中の実行ボタン。
 *
 * @remarks
 * 送信中は押せなくします。二重送信の防止と、押した操作が進んでいることの表示を兼ねます
 * （[0061](../../../../../docs/adr/0061-form-mutation-ux.md)）。
 *
 * `useFormStatus` は `form` の子でしか状態を読めないため、ボタンを別の部品に切り出しています。
 */
function WithdrawSubmit() {
  const { pending } = useFormStatus();
  const label = pending ? PENDING_LABEL : CONFIRM_LABEL;

  return (
    <Button
      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      disabled={pending}
      type="submit"
    >
      {label}
    </Button>
  );
}

/**
 * 退会の導線。
 *
 * @remarks
 * 画面の最下部に他と切り離して置きます。戻せない操作なので、情報を読みに来た利用者が視線の
 * 流れで到達しない位置に要ります。一方で隠しもしません。退会したい利用者が探し回る形にすると、
 * 問い合わせでしか辿り着けなくなります。
 *
 * 確認は `AlertDialogAction` ではなく form の submit で行います。`AlertDialogAction` は押した
 * 時点で dialog を閉じるため、送信中の表示も失敗の文言も、利用者が見ていない場所に出ます。
 * 閉じるのは成立して画面が変わるときだけにしてあります。
 *
 * 完了を待たずに反映されるとは書きません。退会に伴う取り消しや在庫の戻しは結果整合で走るため、
 * 即時に終わると読ませると、直後に古い状態を見た利用者が失敗を疑います。
 */
export function WithdrawBand() {
  const [state, formAction] = useActionState<WithdrawFormState, FormData>(
    withdrawAction,
    idleActionState(),
  );

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>退会</CardTitle>
        <CardDescription>
          退会するとアカウントと登録情報は利用できなくなります。元に戻すことはできません。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {state.status === "error" && state.formError !== null ? (
          <FormFeedback
            description={state.formError}
            title="退会できませんでした"
            variant="destructive"
          />
        ) : null}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              className="self-start bg-destructive text-destructive-foreground hover:bg-destructive/90"
              variant={BUTTON_VARIANT.DEFAULT}
            >
              {CONFIRM_LABEL}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <form action={formAction}>
              <AlertDialogHeader>
                <AlertDialogTitle>退会してもよろしいですか？</AlertDialogTitle>
                <AlertDialogDescription>
                  アカウントと登録情報は利用できなくなり、元に戻すことはできません。購入の取り消しや
                  在庫の戻しは順次処理されるため、退会の直後は反映されていないことがあります。
                  進行中の購入が残っている場合は退会できません。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-6">
                <AlertDialogCancel type="button">キャンセル</AlertDialogCancel>
                <WithdrawSubmit />
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
