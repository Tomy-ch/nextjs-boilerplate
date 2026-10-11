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
import { formatNumber } from "@/model/number";
import type { ProductId } from "@/model/product/product";

import { DISCONTINUE_CONFIRMED_VALUE, DISCONTINUE_FORM_NAMES } from "../../form-names";
import type { DiscontinueConditionValues } from "../conditions-fields/conditions-fields";

/** `DiscontinueConfirmDialog` の props。 */
export type DiscontinueConfirmDialogProps = {
  /** 確認を開いているか。 */
  open: boolean;
  /** 確認をやめたことを伝える。 */
  onDismiss: () => void;
  /** 廃番の送信先。 */
  formAction: (formData: FormData) => void;
  /** 廃番にする商品。 */
  product: { readonly id: ProductId; readonly name: string };
  /** 送る条件。打たれたままの値。 */
  values: DiscontinueConditionValues;
  /** 見積もりの時点で代替クーポンを受け取る利用者の数。 */
  estimatedUserCount: number;
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
function DiscontinueSubmit() {
  const { pending } = useFormStatus();

  return (
    <Button pending={pending} pendingLabel="廃番にしています…" type="submit" variant="destructive">
      廃番にする
    </Button>
  );
}

/**
 * 廃番にする前の確認。
 *
 * @remarks
 * **不可逆なので確認を挟みます。** `AlertDialog` は背景を押しても閉じず、閉じる操作を明示的に
 * 選ばせます。
 *
 * 送信は dialog の中の form が担い、押した瞬間には閉じません。結果は外側が受け、閉じるかどうかも
 * 外側が決めます。条件は外側の欄が持つ値を、送るときに載せ直します。
 *
 * 確認を通った合図を載せるのはこの form だけです。送信先は合図の無い送信を受けません。
 *
 * @see Storybook `Features/Admin/Products/Discontinue/ConfirmDialog`
 */
export function DiscontinueConfirmDialog({
  estimatedUserCount,
  failures,
  formAction,
  idempotencyKey,
  onDismiss,
  open,
  product,
  values,
}: DiscontinueConfirmDialogProps) {
  // 開くのは画面の操作が選ばれたときだけで、この面は trigger を持たない。開閉の合図が来るのは
  // 閉じるときに限られる。
  const close = useCallback(() => onDismiss(), [onDismiss]);

  return (
    <AlertDialog onOpenChange={close} open={open}>
      <AlertDialogContent>
        <form action={formAction} className="grid gap-4">
          <input name={DISCONTINUE_FORM_NAMES.productId} type="hidden" value={product.id} />
          <input name={IDEMPOTENCY_KEY_FIELD} type="hidden" value={idempotencyKey} />
          <input
            name={DISCONTINUE_FORM_NAMES.couponDiscountRate}
            type="hidden"
            value={values.couponDiscountRate}
          />
          <input
            name={DISCONTINUE_FORM_NAMES.couponValidityDays}
            type="hidden"
            value={values.couponValidityDays}
          />
          <input
            name={DISCONTINUE_FORM_NAMES.confirmed}
            type="hidden"
            value={DISCONTINUE_CONFIRMED_VALUE}
          />
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words">
              {product.name} を廃番にしますか？
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="grid gap-2">
                <p>廃番にすると元に戻せません。商品は非公開になり、新たに購入できなくなります。</p>
                <p>
                  カートに入っている明細は消えず、購入できない理由が表示されます。見積もりの時点では{" "}
                  {formatNumber(estimatedUserCount)} 人に、値引き率 {values.couponDiscountRate}
                  %・有効 {values.couponValidityDays} 日の代替クーポンが発行されます。
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {failures.length === 0 ? null : (
            <Alert variant="destructive">
              <AlertTitle>廃番にできませんでした</AlertTitle>
              <AlertDescription>
                {failures.map((failure) => (
                  <p key={failure}>{failure}</p>
                ))}
              </AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel type="button">やめる</AlertDialogCancel>
            <DiscontinueSubmit />
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
