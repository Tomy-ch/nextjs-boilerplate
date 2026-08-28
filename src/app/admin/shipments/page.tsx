import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { ShipmentQueuePageContent } from "@/features/admin/shipments/page-content";
import { ShipmentQueueSkeleton } from "@/features/admin/shipments/ui/skeleton/skeleton";
import { deliverPurchaseAction, shipPurchasesAction } from "./actions";

export const metadata: Metadata = {
  title: "発送",
  robots: { index: false, follow: false },
};

/**
 * 発送を待っている注文を便ごとに見て、発送済みの注文の配達を確認する画面。
 *
 * @remarks
 * 索引に載せない理由は `docs/spec/route/admin/layout.function.md`「索引に載せない」。
 */
export default function AdminShipmentQueuePage() {
  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>発送</PageHeaderTitle>
          <PageHeaderDescription>
            支払いを終えてまだ発送していない注文を便ごとに確認し、発送済みの注文を配達済みにします。
          </PageHeaderDescription>
        </div>
      </PageHeader>
      <Suspense fallback={<ShipmentQueueSkeleton />}>
        <ShipmentQueuePageContent
          deliverAction={deliverPurchaseAction}
          shipAction={shipPurchasesAction}
        />
      </Suspense>
    </ContentContainer>
  );
}
