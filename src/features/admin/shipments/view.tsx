import type { PurchaseDispatchGroup } from "@/model/purchase/purchase";

import type { ShipmentAction } from "./form-state";
import { DispatchGroupCard } from "./ui/dispatch-group/dispatch-group";
import { ShipmentQueueEmpty } from "./ui/empty/empty";

/** `ShipmentQueueView` の props。 */
export type ShipmentQueueViewProps = {
  /** 発送を待っている便。 */
  groups: readonly PurchaseDispatchGroup[];
  /** 発送の送信先。 */
  shipAction: ShipmentAction;
};

/**
 * 発送待ちの便を縦に並べる。
 *
 * @remarks
 * 便を横に並べません。1 つの便が持つ注文の数はまちまちで、横に並べると高さの揃わない列ができます。
 *
 * 契約が決めた並びをそのまま出します。並べ直さない理由は
 * [機能要件](../../../../docs/spec/route/admin/shipments/page.function.md)「取得」。
 */
export function ShipmentQueueView({ groups, shipAction }: ShipmentQueueViewProps) {
  if (groups.length === 0) {
    return <ShipmentQueueEmpty />;
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <DispatchGroupCard group={group} key={group.userId} shipAction={shipAction} />
      ))}
    </div>
  );
}
