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

import type { CampaignConfirmation } from "../../campaign-summary";
import { CAMPAIGN_CONFIRMED_VALUE, CAMPAIGN_FORM_NAMES } from "../../form-names";

/** `CampaignConfirmDialog` の props。 */
export type CampaignConfirmDialogProps = {
  /** 確認を開いているか。 */
  open: boolean;
  /** 確認をやめたことを伝える。 */
  onDismiss: () => void;
  /** 定義の送信先。 */
  formAction: (formData: FormData) => void;
  /** 送る値と、人に見せる復唱。 */
  confirmation: CampaignConfirmation;
  /** 再送を初回の結果へ畳むための鍵。 */
  idempotencyKey: string;
  /** 直前の送信が確認の中で失敗したときの文言。無ければ空。 */
  failures: readonly string[];
};

/**
 * 送信中は押せなくする操作。
 *
 * @remarks
 * `useFormStatus` は親の `form` の送信状態しか読めないため、`form` の子として切り出します。
 */
function CampaignSubmit() {
  const { pending } = useFormStatus();

  return (
    <Button pending={pending} pendingLabel="定義しています…" type="submit">
      定義する
    </Button>
  );
}

/**
 * キャンペーンを定義する前の確認。
 *
 * @remarks
 * **定義した後は直せないため、確認を挟みます。** 契約は定義を変える口を持たず、配った時点で
 * クーポンへ焼かれます。使ったコードは二度と使えません。
 *
 * 送信は dialog の中の form が担い、押した瞬間には閉じません。結果は外側が受け、閉じるかどうかも
 * 外側が決めます。値は外側の欄が持つものを、送るときに載せ直します。
 *
 * 確認を通った合図を載せるのはこの form だけです。送信先は合図の無い送信を受けません。
 *
 * @see Storybook `Features/Admin/Campaigns/New/ConfirmDialog`
 */
export function CampaignConfirmDialog({
  confirmation,
  failures,
  formAction,
  idempotencyKey,
  onDismiss,
  open,
}: CampaignConfirmDialogProps) {
  // 開くのは画面の操作が選ばれたときだけで、この面は trigger を持たない。開閉の合図が来るのは
  // 閉じるときに限られる。
  const close = useCallback(() => onDismiss(), [onDismiss]);

  return (
    <AlertDialog onOpenChange={close} open={open}>
      <AlertDialogContent>
        <form action={formAction} className="grid gap-4">
          {confirmation.fields.map(([name, value]) => (
            <input key={name} name={name} type="hidden" value={value} />
          ))}
          <input name={IDEMPOTENCY_KEY_FIELD} type="hidden" value={idempotencyKey} />
          <input
            name={CAMPAIGN_FORM_NAMES.confirmed}
            type="hidden"
            value={CAMPAIGN_CONFIRMED_VALUE}
          />
          <AlertDialogHeader>
            <AlertDialogTitle>この内容でキャンペーンを定義しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              定義した後は内容を変えられず、同じコードはもう使えません。配布を止めることはできます。
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
              <AlertTitle>定義できませんでした</AlertTitle>
              <AlertDescription>
                {failures.map((failure) => (
                  <p key={failure}>{failure}</p>
                ))}
              </AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel type="button">やめる</AlertDialogCancel>
            <CampaignSubmit />
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
