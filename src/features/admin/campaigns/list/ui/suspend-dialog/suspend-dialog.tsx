"use client";

import { useCallback } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/design-system/overlay/alert-dialog/alert-dialog";
import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";

import { SUSPEND_FORM_NAMES } from "../../form-names";
import type { AdminCampaignRow } from "../../row";
import { SuspendSubmitButton } from "../submit-button/submit-button";

/** 確認している相手と、その確認で送る冪等キー。 */
export type SuspendConfirmation = {
  readonly target: AdminCampaignRow;
  readonly idempotencyKey: string;
};

/** `CampaignSuspendDialog` の props。 */
export type CampaignSuspendDialogProps = {
  /** 確認している相手と鍵。確認していなければ null。 */
  confirmation: SuspendConfirmation | null;
  /** 確認をやめたことを伝える。 */
  onDismiss: () => void;
  /** 停止の送信先。 */
  formAction: (formData: FormData) => void;
};

/**
 * 配布を停止する前の確認。
 *
 * @remarks
 * **取り消せないので確認を挟みます。** `AlertDialog` は閉じる操作を明示的に選ばせます（背景を
 * 押しても閉じません）。本文は、取り消せないことと、配ったクーポンは無効にならないことを書きます。
 * 後者を書かないと、停止が配布済みの分まで取り上げると読まれます。
 *
 * 送信は dialog の中の form が担い、結果は外側が受けます。成立すれば dialog は閉じ、そこに
 * 出した結果ごと消えるためです。
 *
 * **鍵はこの面が持ちません。** 開閉で unmount する subtree に置くと、閉じるたびに作り直されます。
 *
 * @param props - {@link CampaignSuspendDialogProps} を参照。
 */
export function CampaignSuspendDialog({
  confirmation,
  formAction,
  onDismiss,
}: CampaignSuspendDialogProps) {
  /**
   * 確認をやめたことを呼び出し元へ伝える。
   *
   * @remarks
   * 開くのは行の操作が選ばれたときだけで、この面は trigger を持たない。したがって開閉の合図が
   * 来るのは閉じるときに限られる。
   */
  const close = useCallback(() => onDismiss(), [onDismiss]);
  const target = confirmation?.target;

  return (
    <AlertDialog onOpenChange={close} open={confirmation !== null}>
      <AlertDialogContent>
        <form action={formAction}>
          <input name={SUSPEND_FORM_NAMES.campaignId} type="hidden" value={target?.id ?? ""} />
          <input name={SUSPEND_FORM_NAMES.campaignCode} type="hidden" value={target?.code ?? ""} />
          <input
            name={IDEMPOTENCY_KEY_FIELD}
            type="hidden"
            value={confirmation?.idempotencyKey ?? ""}
          />
          <AlertDialogHeader>
            <AlertDialogTitle className="break-all">
              {target?.code} の配布を停止しますか？
            </AlertDialogTitle>
            <AlertDialogDescription>
              停止は取り消せない操作です。以後このコードではクーポンを受け取れなくなります。
              すでに配ったクーポンは無効にならないため、受け取った人はそのまま使えます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">やめる</AlertDialogCancel>
            <SuspendSubmitButton />
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
