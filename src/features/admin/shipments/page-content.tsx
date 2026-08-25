import { Suspense } from "react";
import { withScreenSpan } from "@/observability/render-span";
import type { ShipmentAction } from "./form-state";
import { ShipmentQueueResults } from "./results";
import { ShipmentQueueSkeleton } from "./ui/skeleton/skeleton";

/** `ShipmentQueuePageContent` の props。 */
export type ShipmentQueuePageContentProps = {
  /** 発送の送信先。 */
  shipAction: ShipmentAction;
};

/**
 * 発送待ちの組み立て。
 *
 * @remarks
 * 待機の境界を一覧本体だけに掛けます。取得を待つのは組の並びだけで、見出しはその前に描かれます。
 */
export const ShipmentQueuePageContent = withScreenSpan(
  "features/admin/shipments/page-content",
  ({ shipAction }: ShipmentQueuePageContentProps) => {
    return (
      <Suspense fallback={<ShipmentQueueSkeleton />}>
        <ShipmentQueueResults shipAction={shipAction} />
      </Suspense>
    );
  },
);
