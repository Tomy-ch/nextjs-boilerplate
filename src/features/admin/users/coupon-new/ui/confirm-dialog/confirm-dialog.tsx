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

export type IssueConfirmDialogProps = {
  open: boolean;
  onDismiss: () => void;
  formAction: (formData: FormData) => void;
  recipient: Pick<IssueRecipient, "id" | "name">;
  confirmation: IssueConfirmation;
  idempotencyKey: string;
  failures: readonly string[];
};

function IssueSubmit() {
  const { pending } = useFormStatus();

  return (
    <Button pending={pending} pendingLabel="発行しています…" type="submit">
      発行する
    </Button>
  );
}

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
