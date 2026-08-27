"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import { Button } from "@/components/design-system/action/button/button";
import { BUTTON_VARIANT } from "@/components/design-system/action/button/button.definition";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/design-system/display/card/card";
import { idleActionState } from "@/model/action-state";
import { formatDateTime } from "@/model/datetime";
import { formatMoney } from "@/model/money";
import type { PurchaseHistoryEntry } from "@/model/purchase/purchase";

import { SHIPMENT_FORM_NAMES } from "../../form-names";
import type { DeliveryAction, DeliveryState } from "../../form-state";

/** `DeliveryListCard` の props。 */
export type DeliveryListCardProps = {
  /** 発送済みで、まだ配達済みになっていない注文。 */
  purchases: readonly PurchaseHistoryEntry[];
  /** 配達の確認の送信先。 */
  deliverAction: DeliveryAction;
};

/**
 * 送信中は押せなくする操作。
 *
 * @remarks
 * 切り出す理由は `dispatch-group.tsx` の `ShipSubmit` と同じで、`useFormStatus` が `form` の子で
 * しか送信状態を読めないためです。
 */
function DeliverSubmit() {
  const { pending } = useFormStatus();

  return (
    <Button
      pending={pending}
      pendingLabel="確認しています…"
      size="sm"
      type="submit"
      variant={BUTTON_VARIANT.OUTLINE}
    >
      配達済みにする
    </Button>
  );
}

/**
 * 発送済みの注文を並べ、配達を確認する。
 *
 * @remarks
 * **まとめる操作を持ちません。** 届いたかどうかは注文ごとに分かれるので、まとめて確認できる形に
 * すると、確かめていないものまで確認済みにする経路ができます。
 *
 * 結果をこのカードに 1 つだけ出します。押した行の脇に出さないのは、行ごとに送信状態を持たせると
 * 同じ操作が並ぶ数だけ状態が増え、どれが最後の結果なのかが読み取れなくなるためです。
 *
 * 何をどう見せるかは
 * [画面要件](../../../../../../docs/spec/route/admin/shipments/page.screen.md)。
 */
export function DeliveryListCard({ purchases, deliverAction }: DeliveryListCardProps) {
  const [state, formAction] = useActionState<DeliveryState, FormData>(
    deliverAction,
    idleActionState(),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">発送済み</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {purchases.length === 0 ? (
          <p className="text-muted-foreground text-sm">配達の確認を待っている注文はありません。</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {purchases.map((purchase) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 py-3"
                key={purchase.code}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="break-all font-mono text-sm">{purchase.code}</span>
                  <span className="text-muted-foreground text-sm">
                    {formatDateTime(purchase.orderedAt)} / {formatMoney(purchase.totalAmount)}
                  </span>
                </div>
                <form action={formAction}>
                  <input
                    name={SHIPMENT_FORM_NAMES.purchaseCode}
                    type="hidden"
                    value={purchase.code}
                  />
                  <DeliverSubmit />
                </form>
              </li>
            ))}
          </ul>
        )}

        {state.status === "success" ? (
          <FormFeedback
            description={`注文 ${state.value.purchaseCode} を配達済みにしました。`}
            title="配達を確認しました"
          />
        ) : null}

        {state.status === "error" && state.formError !== null ? (
          <FormFeedback
            description={state.formError}
            title="配達済みにできませんでした"
            variant="destructive"
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
