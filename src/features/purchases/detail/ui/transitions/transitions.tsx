"use client";

import { useActionState } from "react";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import { BUTTON_VARIANT } from "@/components/design-system/action/button/button.definition";
import { idleActionState } from "@/model/action-state";
import type { Purchase } from "@/model/purchase/purchase";
import { canCancelPurchase, canPayPurchase } from "@/model/purchase/purchase-status";

import { cancelPurchaseAction, payPurchaseAction } from "../../../actions";
import { purchaseDetailPath } from "../../../facade/paths/paths";
import type { PurchaseTransitionState } from "../../../form-state";
import { PurchaseTransitionButton } from "../transition-button/transition-button";

const PAY_DESCRIPTION =
  "この注文のお支払いを確定します。支払い方法の入力はなく、この操作だけで支払い済みになります。" +
  "確定した後も、発送されるまではキャンセルできます。";

const CANCEL_DESCRIPTION =
  "この注文を取り消します。元に戻すことはできません。" +
  "取り消した商品は在庫へ戻るため、同じ内容で買うには改めて注文が必要です。";

/** `PurchaseTransitions` の props。 */
export type PurchaseTransitionsProps = {
  /** 操作の対象。いまの状況が、出す操作を決める。 */
  purchase: Purchase;
};

/**
 * 成立した送信の知らせ。
 *
 * @remarks
 * 通らなかったことは確認の中が伝えるので、ここは成立だけを出します。進んだ購入では操作そのものが
 * 出なくなるため、この知らせがその場に残る唯一の手掛かりになります。
 */
function TransitionResult({
  state,
  successTitle,
}: {
  state: PurchaseTransitionState;
  successTitle: string;
}) {
  return state.status === "success" ? <FormFeedback title={successTitle} /> : null;
}

/**
 * その購入にいまできる操作と、その結果。
 *
 * @remarks
 * **できない操作は押せなくするのではなく出しません。** 押せないボタンは「いつか押せる」と読めて
 * しまい、支払い済みの注文に灰色の「支払う」が残ると、何を待てばよいのかが伝わりません
 * （[0053](../../../../../../docs/adr/0053-ui-component-interaction-seam.md)）。
 *
 * 可否の判定は `model` が持ちます。同じ状態機械を admin 側の操作も読むため、画面ごとに書くと
 * 判定が分かれます。
 *
 * **成立の知らせをこの段が持ちます。** 成立すると画面は取り直され、押した操作はその場から
 * 消えます。知らせまで一緒に消えると、押した人には何が起きたのかを確かめる手掛かりが状況の badge
 * しか残りません（[0063](../../../../../../docs/adr/0063-mutation-result-notification.md)）。通ら
 * なかったことは確認の中が伝えるので、ここには出しません。
 *
 * したがってこの段は、出す操作が 1 つも無くなっても知らせを抱えたまま残ります。逆に、まだ何も
 * 送っておらず出す操作も無い購入では、段そのものが現れません（余白だけが残らないよう、間隔と
 * 紙面での扱いもこの段が持ちます）。
 *
 * 支払いを先に置くのは、その購入で次に進む操作だからです。取り消しは進むのをやめる操作なので、
 * 並べる順でも後ろへ置き、**開く側は縁だけにして進む操作に前を譲ります。** 戻せないことは確認の
 * 中の実行ボタンが赤で伝えるので、確定の瞬間には必ず目に入ります。
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

  const payable = canPayPurchase(purchase.statusCode);
  const cancelable = canCancelPurchase(purchase.statusCode);
  const reported = payState.status !== "idle" || cancelState.status !== "idle";

  if (!payable && !cancelable && !reported) {
    return null;
  }

  const reloadHref = purchaseDetailPath(purchase.code);

  return (
    <div className="mt-6 flex flex-col gap-3 print-hidden">
      {payable || cancelable ? (
        <div className="flex flex-wrap gap-3">
          {payable ? (
            <PurchaseTransitionButton
              confirmDescription={PAY_DESCRIPTION}
              confirmTitle="この注文を支払いますか？"
              failureTitle="支払えませんでした"
              formAction={payFormAction}
              label="支払う"
              pendingLabel="支払っています…"
              purchaseCode={purchase.code}
              reloadHref={reloadHref}
              state={payState}
            />
          ) : null}
          {cancelable ? (
            <PurchaseTransitionButton
              confirmDescription={CANCEL_DESCRIPTION}
              confirmTitle="この注文をキャンセルしますか？"
              confirmVariant={BUTTON_VARIANT.DESTRUCTIVE}
              failureTitle="キャンセルできませんでした"
              formAction={cancelFormAction}
              label="キャンセルする"
              pendingLabel="キャンセルしています…"
              purchaseCode={purchase.code}
              reloadHref={reloadHref}
              state={cancelState}
              variant={BUTTON_VARIANT.OUTLINE}
            />
          ) : null}
        </div>
      ) : null}

      <TransitionResult state={payState} successTitle="お支払いを受け付けました" />
      <TransitionResult state={cancelState} successTitle="キャンセルを受け付けました" />
    </div>
  );
}
