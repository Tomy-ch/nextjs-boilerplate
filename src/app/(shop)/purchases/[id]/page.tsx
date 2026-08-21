import type { Metadata } from "next";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import { requireRegisteredUser } from "@/features/account/registration-gate";
import { PurchaseDetailPageContent } from "@/features/purchases/detail/page-content";
import { purchaseDetailPath } from "@/features/purchases/facade/paths/paths";

export const metadata: Metadata = {
  title: "購入詳細",
  description: "購入 1 件の控えと明細を確認できます。",
};

/**
 * 購入詳細。
 *
 * @remarks
 * 確定認可をここで通します。`proxy.ts` の判定は cookie を読むだけの前捌きで、防御線ではありません
 * （[0079](../../../../../docs/adr/0079-auth-frontend-seam.md)）。
 *
 * 取得も組み立ても持ちません。route と feature をつなぐだけの薄い層です
 * （[0040](../../../../../docs/adr/0040-routing-rendering-strategy.md)）。
 *
 * `loading.tsx` を置いていません。置くと応答が streaming になり、存在しない購入でも 200 が
 * 返ってしまうためです。1 件の取得だけを待つ画面では、待機表示より正しいステータスを優先します。
 *
 * 見出しを置きません。この画面の見出しはパンくずの現在地（注文番号）が担っており、
 * `PageHeader` を重ねると同じ識別子が 2 度並びます。
 */
export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireRegisteredUser(purchaseDetailPath(id));

  return (
    <ContentContainer className="py-8">
      <PurchaseDetailPageContent purchaseId={id} />
    </ContentContainer>
  );
}
