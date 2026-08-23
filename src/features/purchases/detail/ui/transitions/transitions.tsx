"use client";

import { useActionState } from "react";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import { idleActionState } from "@/model/action-state";
import type { Purchase } from "@/model/purchase/purchase";
import {
  availablePurchaseTransitions,
  PURCHASE_TRANSITION,
  type PurchaseTransition,
} from "@/model/purchase/purchase-status";

import { cancelPurchaseAction, payPurchaseAction } from "../../../actions";
import { purchaseDetailPath } from "../../../facade/paths/paths";
import type { PurchaseTransitionState } from "../../../form-state";
import { PurchaseTransitionButton } from "../transition-button/transition-button";
import { PRESENTATIONS } from "./presentation";

/** 送信の状態を引くための、遷移の全種。画面に出す順とは無関係。 */
const ALL_TRANSITIONS: readonly PurchaseTransition[] = [
  PURCHASE_TRANSITION.PAY,
  PURCHASE_TRANSITION.CANCEL,
];

/** `PurchaseTransitions` の props。 */
export type PurchaseTransitionsProps = {
  /** 操作の対象。いまの状況が、出す操作を決める。 */
  purchase: Purchase;
};

/**
 * その購入にいまできる操作と、成立の知らせ。
 *
 * @remarks
 * **できない操作は押せなくするのではなく出しません。** 押せないボタンは「いつか押せる」と読めて
 * しまい、支払い済みの注文に灰色の「支払う」が残ると、何を待てばよいのかが伝わりません
 * （[0053](../../../../../../docs/adr/0053-ui-component-interaction-seam.md)）。
 *
 * **何ができるかは `model` に聞きます。** 同じ状態機械を admin 側の操作も読むため、画面ごとに
 * 判定を書くと分かれます。並べる順も `model` が返す順で、進む操作が先に来ます。
 *
 * **成立の知らせをこの段が持ちます。** 成立すると画面は取り直され、押した操作はその場から消え
 * ます。知らせまで一緒に消えると、押した人には何が起きたのかを確かめる手掛かりが状況の badge
 * しか残りません（[0063](../../../../../../docs/adr/0063-mutation-result-notification.md)）。通ら
 * なかったことは確認の中が伝えるので、ここには出しません。
 *
 * したがってこの段は、出す操作が 1 つも無くなっても知らせを抱えたまま残ります。逆に、まだ何も
 * 送っておらず出す操作も無い購入では、段そのものが現れません（余白だけが残らないよう、間隔と
 * 紙面での扱いもこの段が持ちます）。
 */
export function PurchaseTransitions({ purchase }: PurchaseTransitionsProps) {
  const [payState, payFormAction] = useActionState<PurchaseTransitionState, FormData>(
    payPurchaseAction,
    idleActionState(),
  );
  const [cancelState, cancelFormAction] = useActionState<PurchaseTransitionState, FormData>(
    cancelPurchaseAction,
    idleActionState(),
  );

  const submissions: Readonly<
    Record<
      PurchaseTransition,
      { state: PurchaseTransitionState; formAction: (formData: FormData) => void }
    >
  > = {
    [PURCHASE_TRANSITION.PAY]: { state: payState, formAction: payFormAction },
    [PURCHASE_TRANSITION.CANCEL]: { state: cancelState, formAction: cancelFormAction },
  };

  const available = availablePurchaseTransitions(purchase.statusCode);
  const reported = ALL_TRANSITIONS.filter(
    (transition) => submissions[transition].state.status === "success",
  );

  if (available.length === 0 && reported.length === 0) {
    return null;
  }

  const reloadHref = purchaseDetailPath(purchase.code);

  return (
    <div className="mt-6 flex flex-col gap-3 print-hidden">
      {available.length === 0 ? null : (
        <div className="flex flex-wrap gap-3">
          {available.map((transition) => (
            <PurchaseTransitionButton
              confirmDescription={PRESENTATIONS[transition].confirmDescription}
              confirmTitle={PRESENTATIONS[transition].confirmTitle}
              confirmVariant={PRESENTATIONS[transition].confirmVariant}
              failureTitle={PRESENTATIONS[transition].failureTitle}
              formAction={submissions[transition].formAction}
              key={transition}
              label={PRESENTATIONS[transition].label}
              pendingLabel={PRESENTATIONS[transition].pendingLabel}
              purchaseCode={purchase.code}
              reloadHref={reloadHref}
              state={submissions[transition].state}
              variant={PRESENTATIONS[transition].variant}
            />
          ))}
        </div>
      )}

      {reported.map((transition) => (
        <FormFeedback key={transition} title={PRESENTATIONS[transition].successTitle} />
      ))}
    </div>
  );
}
