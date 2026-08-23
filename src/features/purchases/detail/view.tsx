import Link from "next/link";

import { Button } from "@/components/design-system/action/button/button";
import { BUTTON_VARIANT } from "@/components/design-system/action/button/button.definition";
import { PrintButton } from "@/components/design-system/action/print-button/print-button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/design-system/navigation/breadcrumb/breadcrumb";
import { PRODUCT_LIST_PATH } from "@/features/products/facade/list-url/list-url";
import type { ReferenceAmount } from "@/model/money";
import type { Purchase } from "@/model/purchase/purchase";
import { PurchaseAmountSummary } from "../facade/amount-summary/amount-summary";
import { PurchaseLineList } from "../facade/lines/lines";
import { PURCHASE_HISTORY_PATH } from "../facade/paths/paths";
import { PurchaseReceiptCard } from "../facade/receipt/receipt";
import { PurchaseTransitions } from "./ui/transitions/transitions";

/** `PurchaseDetailView` の props。 */
export type PurchaseDetailViewProps = {
  /** 表示する購入。 */
  purchase: Purchase;
  /** 合計の参考換算額。読めなければ null。 */
  reference: ReferenceAmount | null;
};

/**
 * 購入 1 件の詳細表示。
 *
 * @remarks
 * **この購入にできることは控えの中に置きます。** 何ができるかを決めているのが控えの出している
 * 状況そのものなので、根拠と操作を離すと、押せる操作が変わった理由を画面の別の場所へ探しに
 * 行くことになります。
 *
 * 画面が何を見せ、どう組み替え、紙に何を出すかは
 * [画面要件](../../../../docs/spec/route/shop/purchases/[code]/page.screen.md)。
 */
export function PurchaseDetailView({ purchase, reference }: PurchaseDetailViewProps) {
  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb className="print-hidden">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href={PURCHASE_HISTORY_PATH}>購入履歴</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {/* 契約が返すのは UUID なので、1 行に収まる前提を置けない。 */}
              <BreadcrumbPage className="max-w-40 truncate font-mono">
                {purchase.code}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <PrintButton />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <PurchaseReceiptCard
          actions={<PurchaseTransitions purchase={purchase} />}
          purchase={purchase}
        />
        <div className="rounded-lg border p-4">
          <PurchaseAmountSummary purchase={purchase} reference={reference} />
        </div>
      </div>

      <PurchaseLineList lines={purchase.lines} />

      <div className="flex flex-wrap gap-3 print-hidden">
        <Button asChild variant={BUTTON_VARIANT.OUTLINE}>
          <Link href={PURCHASE_HISTORY_PATH}>購入履歴へ戻る</Link>
        </Button>
        <Button asChild variant={BUTTON_VARIANT.OUTLINE}>
          <Link href={PRODUCT_LIST_PATH}>買い物を続ける</Link>
        </Button>
      </div>
    </article>
  );
}
