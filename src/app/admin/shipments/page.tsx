import type { Metadata } from "next";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { ShipmentQueuePageContent } from "@/features/admin/shipments/page-content";

import { deliverPurchaseAction, shipPurchasesAction } from "./actions";

export const metadata: Metadata = {
  title: "発送",
  robots: { index: false, follow: false },
};

/**
 * 発送を待っている注文を便ごとに見て、発送済みの注文の配達を確認する画面。
 *
 * @remarks
 * 検索エンジンに拾わせません。管理の面は認可の内側にあり、索引に載っても辿り着けないうえ、
 * 存在だけが外へ出ます（[0044](../../../../docs/adr/0044-seo-metadata-strategy.md)）。
 *
 * 取得も組み立ても持ちません。route と feature をつなぐだけの薄い層です
 * （[0040](../../../../docs/adr/0040-routing-rendering-strategy.md)）。
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
      <ShipmentQueuePageContent
        deliverAction={deliverPurchaseAction}
        shipAction={shipPurchasesAction}
      />
    </ContentContainer>
  );
}
