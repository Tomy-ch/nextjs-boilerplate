import type { PurchaseDispatchGroup, PurchaseHistoryEntry } from "@/model/purchase/purchase";

import type { DeliveryAction, ShipmentAction } from "./form-state";
import { DeliveryListCard } from "./ui/delivery-list/delivery-list";
import { DispatchGroupCard } from "./ui/dispatch-group/dispatch-group";
import { ShipmentQueueEmpty } from "./ui/empty/empty";

/** `ShipmentQueueView` の props。 */
export type ShipmentQueueViewProps = {
  /** 発送を待っている便。 */
  groups: readonly PurchaseDispatchGroup[];
  /** 発送済みで、まだ配達済みになっていない注文。 */
  shipped: readonly PurchaseHistoryEntry[];
  /** 発送の送信先。 */
  shipAction: ShipmentAction;
  /** 配達の確認の送信先。 */
  deliverAction: DeliveryAction;
};

/**
 * 発送を待っている便と、配達の確認を待っている注文を縦に並べる。
 *
 * @remarks
 * 便を横に並べません。1 つの便が持つ注文の数はまちまちで、横に並べると高さの揃わない列ができます。
 *
 * **2 つの区画を 1 つの画面に置きます。** どちらも同じ担当者が同じ時間に見るもので、注文は発送
 * から配達へ続けて進みます。画面を分けると、発送した直後の注文を見るために移動が要ります。
 *
 * **どちらも空のときだけ「何もない」と言います。** 片方だけが空なのは仕事が片付いた状態で、
 * 画面から何も無くなるわけではありません。
 *
 * 契約が決めた並びをそのまま出します。並べ直さない理由は
 * [機能要件](../../../../docs/spec/route/admin/shipments/page.function.md)「取得」。
 */
export function ShipmentQueueView({
  groups,
  shipped,
  shipAction,
  deliverAction,
}: ShipmentQueueViewProps) {
  if (groups.length === 0 && shipped.length === 0) {
    return <ShipmentQueueEmpty />;
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <DispatchGroupCard group={group} key={group.userId} shipAction={shipAction} />
      ))}
      <DeliveryListCard deliverAction={deliverAction} purchases={shipped} />
    </div>
  );
}
