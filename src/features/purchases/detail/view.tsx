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
import { withScreenSpan } from "@/observability/render-span";
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
 * 画面が何を見せ、どう組み替え、紙に何を出すかは
 * [画面要件](../../../../docs/spec/route/shop/purchases/[code]/page.screen.md)。
 *
 * 見出し（`h1`）は画面には出さず sr-only に留める（画面要件「見出し」）。
 *
 * 購入コードは契約上 UUID で返るため、1 行に収まる前提を置けない。
 *
 * @param props - 受け取る内容。個々の意味は {@link PurchaseDetailViewProps} の各メンバーが持つ。
 * @see Storybook `Page/Purchases/Detail`
 */
export const PurchaseDetailView = withScreenSpan(
  "features/purchases/detail/view",
  ({ purchase, reference }: PurchaseDetailViewProps) => {
    return (
      <article className="flex flex-col gap-6">
        <h1 className="sr-only">購入 {purchase.code}</h1>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb className="print-hidden">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href={PURCHASE_HISTORY_PATH}>購入履歴</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
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
  },
);
