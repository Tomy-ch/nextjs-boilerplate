"use client";

import { useActionState } from "react";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import { idleActionState } from "@/model/action-state";
import type { Purchase } from "@/model/purchase/purchase";

import { cancelPurchaseAction, payPurchaseAction } from "../../../actions";
import { purchaseDetailPath } from "../../../facade/paths/paths";
import type { PurchaseTransitionState } from "../../../form-state";
import {
  availablePurchaseTransitions,
  PURCHASE_TRANSITION,
  type PurchaseTransition,
} from "../../available-transitions";
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
 * **成立の知らせをこの段が持ちます。** 成立すると画面は取り直され、押した操作はその場から
 * 消えます。したがってこの段は、出す操作が 1 つも無くなっても知らせを抱えたまま残り、逆に、まだ
 * 何も送っておらず出す操作も無い購入では現れません（余白だけが残らないよう、間隔と紙面での扱いも
 * この段が持ちます）。通らなかったことは確認の中が伝えます（{@link PurchaseTransitionButton}）。
 *
 * 何を出し何を出さないか、結果をどこへ出すかは
 * [画面要件](../../../../../../docs/spec/route/shop/purchases/[code]/page.screen.md)
 * 「この購入にできること」。
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
