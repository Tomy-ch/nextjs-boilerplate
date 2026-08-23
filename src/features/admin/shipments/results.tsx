import { getShippablePurchases } from "@/adapters/server/api/purchases";

import type { ShipmentAction } from "./form-state";
import { ShipmentQueueView } from "./view";

/** `ShipmentQueueResults` の props。 */
export type ShipmentQueueResultsProps = {
  /** 発送の送信先。 */
  shipAction: ShipmentAction;
};

/**
 * 発送待ちの取得。
 *
 * @remarks
 * 取得だけを持ちます。見た目を持たないのは、待機の境界がこの取得に掛かるためで、境界の内側が
 * 取得と描画の両方を抱えると、描画の都合で境界の位置が動きます
 * （[0040](../../../../docs/adr/0040-routing-rendering-strategy.md)）。
 */
export async function ShipmentQueueResults({ shipAction }: ShipmentQueueResultsProps) {
  return <ShipmentQueueView groups={await getShippablePurchases()} shipAction={shipAction} />;
}
