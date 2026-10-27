"use client";

import { useCallback } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/design-system/action/button/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/design-system/overlay/alert-dialog/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/design-system/status/alert/alert";
import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";

import { ISSUE_CONFIRMED_VALUE, ISSUE_FORM_NAMES } from "../../form-names";
import type { IssueConfirmation } from "../../issue-summary";
import type { IssueRecipient } from "../../recipient";

/** `IssueConfirmDialog` の props。 */
export type IssueConfirmDialogProps = {
  /** 確認を開いているか。 */
  open: boolean;
  /** 確認を閉じる操作が選ばれたことを伝える。 */
  onDismiss: () => void;
  /** 発行を送る。受給者・内容・冪等キー・確認の合図を載せた値を受ける。 */
  formAction: (formData: FormData) => void;
  /** 受給者。名前を見出しに出し、識別子を hidden で載せる。 */
  recipient: Pick<IssueRecipient, "id" | "name">;
  /** 送る値と、人に見せる復唱。 */
  confirmation: IssueConfirmation;
  /** この送信の冪等キー。持ち主は呼び出し元で、ここでは載せるだけ。 */
  idempotencyKey: string;
  /** 確認の中に出す失敗の文言。 */
  failures: readonly string[];
};

/** 送信中は押せない、発行の送信ボタン。 */
function IssueSubmit() {
  const { pending } = useFormStatus();

  return (
    <Button pending={pending} pendingLabel="発行しています…" type="submit">
      発行する
    </Button>
  );
}

/**
 * 発行の確認。受給者を名指しし、発行が取り消せないことを述べてから送る。
 *
 * @remarks
 * 発行はこの中の form からだけ送ります。確認の合図を載せるのはこの form だけなので、確認を
 * 経ない送信は受け取る側で拒まれます。
 *
 * @param props - {@link IssueConfirmDialogProps} を参照。
 * @see Storybook `Features/Admin/Users/CouponNew/ConfirmDialog`
 */
export function IssueConfirmDialog({
  confirmation,
  failures,
  formAction,
  idempotencyKey,
  onDismiss,
  open,
  recipient,
}: IssueConfirmDialogProps) {
  const close = useCallback(() => onDismiss(), [onDismiss]);

  return (
    <AlertDialog onOpenChange={close} open={open}>
      <AlertDialogContent>
        <form action={formAction} className="grid gap-4">
          <input name={ISSUE_FORM_NAMES.userId} type="hidden" value={recipient.id} />
          {confirmation.fields.map(([name, value]) => (
            <input key={name} name={name} type="hidden" value={value} />
          ))}
          <input name={IDEMPOTENCY_KEY_FIELD} type="hidden" value={idempotencyKey} />
          <input name={ISSUE_FORM_NAMES.confirmed} type="hidden" value={ISSUE_CONFIRMED_VALUE} />
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words">
              {recipient.name} さんにこのクーポンを発行しますか？
            </AlertDialogTitle>
            <AlertDialogDescription>
              発行は取り消せません。発行したクーポンは無効にできず、内容も変えられません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            {confirmation.summary.map(({ detail, term }) => (
              <div className="contents" key={term}>
                <dt className="text-muted-foreground">{term}</dt>
                <dd className="break-words">{detail}</dd>
              </div>
            ))}
          </dl>
          {failures.length === 0 ? null : (
            <Alert variant="destructive">
              <AlertTitle>発行できませんでした</AlertTitle>
              <AlertDescription>
                {failures.map((failure) => (
                  <p key={failure}>{failure}</p>
                ))}
              </AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel type="button">やめる</AlertDialogCancel>
            <IssueSubmit />
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
