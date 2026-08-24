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
 * パンくずを置くのは、購入履歴の下の階層にあり、global nav から 1 手で戻れない祖先を持つ
 * ためです（[0026](../../../../docs/adr/0026-layout-shell-mount.md)）。現在地に置くのは購入コード
 * です。利用者がこの画面を見分ける手がかりであり、控えとの突き合わせにも使います。
 *
 * 控えと内訳を並べ、明細をその下へ全幅で置きます。明細は行数が読めないため、脇へ入れると幅の
 * 狭い列で商品名が折り返し続けます。
 *
 * 金額の内訳を脇へ貼り付けません。この画面には送信の操作が無く、読み進めるあいだ画面に残して
 * おきたい操作が無いためです。
 *
 * 紙に出すのは控えと内訳と明細だけです。押せない操作（パンくず・次の行き先・印刷そのもの・
 * 円の切り替え）は紙面の場所を取るだけなので落とします。この購入の控えは手元へ残す対象なので、
 * 印刷の操作はパンくずと同じ段の右端に置きます。
 */
export const PurchaseDetailView = withScreenSpan(
  "features/purchases/detail/view",
  ({ purchase, reference }: PurchaseDetailViewProps) => {
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
          <PurchaseReceiptCard purchase={purchase} />
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
