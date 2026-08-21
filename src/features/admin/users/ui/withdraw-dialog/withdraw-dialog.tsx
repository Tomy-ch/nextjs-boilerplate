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

import { WITHDRAW_FORM_NAMES } from "../../form-names";
import type { AdminUserRow } from "../../row";
import { WithdrawSubmitButton } from "../submit-button/submit-button";

/** `UserWithdrawDialog` の props。 */
export type UserWithdrawDialogProps = {
  /** 確認している相手。確認していなければ null。 */
  target: AdminUserRow | null;
  /** 確認をやめたことを伝える。 */
  onDismiss: () => void;
  /** 退会の送信先。 */
  formAction: (formData: FormData) => void;
};

/**
 * 退会させる前の確認。
 *
 * @remarks
 * **不可逆なので確認を挟みます。**押し間違いが取り返せない操作で、`AlertDialog` は閉じる操作を
 * 明示的に選ばせます（背景を押しても閉じません）。
 *
 * 本文が何を書くか（戻せないこと / 後始末が同時には終わらないこと）は
 * [画面要件](../../../../../../docs/spec/route/admin/users/page.screen.md)「退会の確認」。
 *
 * 送信は dialog の中の form が担い、結果は外側が受けます。成立すれば dialog は閉じ、そこに
 * 出した結果ごと消えるためです。
 */
export function UserWithdrawDialog({ formAction, onDismiss, target }: UserWithdrawDialogProps) {
  // 開くのは行の操作が選ばれたときだけで、この面は trigger を持たない。したがって開閉の合図が
  // 来るのは閉じるときに限られる。
  const close = useCallback(() => onDismiss(), [onDismiss]);

  return (
    <AlertDialog onOpenChange={close} open={target !== null}>
      <AlertDialogContent>
        <form action={formAction}>
          <input name={WITHDRAW_FORM_NAMES.userId} type="hidden" value={target?.id ?? ""} />
          <input name={WITHDRAW_FORM_NAMES.userName} type="hidden" value={target?.name ?? ""} />
          <AlertDialogHeader>
            <AlertDialogTitle>{target?.name} を退会させますか？</AlertDialogTitle>
            <AlertDialogDescription>
              退会させると元に戻せません。進行中の購入の取消と在庫の戻しは後から順に進むため、
              退会した直後の一覧には反映されていないことがあります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">やめる</AlertDialogCancel>
            <WithdrawSubmitButton />
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
