import Link from "next/link";

import { Button } from "@/components/design-system/action/button/button";
import { BUTTON_VARIANT } from "@/components/design-system/action/button/button.definition";
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

import { PURCHASE_HISTORY_PATH } from "../facade/paths/paths";
import { PurchaseAmountSummary } from "./ui/amount-summary/amount-summary";
import { PurchaseLineList } from "./ui/lines/lines";
import { PurchaseReceiptCard } from "./ui/receipt/receipt";

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
 */
export function PurchaseDetailView({ purchase, reference }: PurchaseDetailViewProps) {
  return (
    <article className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={PURCHASE_HISTORY_PATH}>購入履歴</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            {/* 契約が返すのは UUID なので、1 行に収まる前提を置けない。 */}
            <BreadcrumbPage className="max-w-40 truncate font-mono">{purchase.code}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <PurchaseReceiptCard purchase={purchase} />
        <div className="rounded-lg border p-4">
          <PurchaseAmountSummary purchase={purchase} reference={reference} />
        </div>
      </div>

      <PurchaseLineList lines={purchase.lines} />

      <div className="flex flex-wrap gap-3">
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
