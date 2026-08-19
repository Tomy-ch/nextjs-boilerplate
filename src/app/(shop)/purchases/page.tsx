import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { verifySession } from "@/adapters/server/auth/session";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { PURCHASE_HISTORY_PATH } from "@/features/purchases/facade/paths/paths";
import { PurchaseHistoryPageContent } from "@/features/purchases/history/page-content";
import type { RawSearchParams } from "@/features/purchases/history/period";
import { toSafeReturnUrl } from "@/model/return-url";

export const metadata: Metadata = {
  title: "購入履歴",
  description: "これまでの購入を、期間で絞り込みながら確認できます。",
};

/**
 * 購入履歴。
 *
 * @remarks
 * 確定認可をここで通します。`proxy.ts` の判定は cookie を読むだけの前捌きで、防御線ではありません
 * （[0079](../../../../docs/adr/0079-auth-frontend-seam.md)）。
 *
 * 取得も組み立ても持ちません。route と feature をつなぐだけの薄い層です
 * （[0040](../../../../docs/adr/0040-routing-rendering-strategy.md)）。
 *
 * パンくずは置きません。global nav がこの画面を直接指しており、階層が 1 段だからです
 * （[0026](../../../../docs/adr/0026-layout-shell-mount.md)）。
 */
export default async function PurchaseHistoryPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  if ((await verifySession()) === null) {
    redirect(`/login?returnUrl=${encodeURIComponent(toSafeReturnUrl(PURCHASE_HISTORY_PATH))}`);
  }

  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>購入履歴</PageHeaderTitle>
          <PageHeaderDescription>
            注文日時の新しい順に並んでいます。期間で絞り込めます。
          </PageHeaderDescription>
        </div>
      </PageHeader>
      <PurchaseHistoryPageContent searchParams={await searchParams} />
    </ContentContainer>
  );
}
