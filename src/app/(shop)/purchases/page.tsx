import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { requireRegisteredUser } from "@/features/account/registration-gate";
import { PURCHASE_HISTORY_PATH } from "@/features/purchases/facade/paths/paths";
import { PurchaseHistoryPageContent } from "@/features/purchases/history/page-content";
import { PurchaseHistorySkeleton } from "@/features/purchases/history/ui/skeleton/skeleton";
import type { RawSearchParams } from "@/model/search-params";

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
/**
 * 履歴の中身。
 *
 * @remarks
 * **取得と判定を解くのはここです。** 器の側で待つと、待っている間は殻すら配れません
 * （[0041](../../../../docs/adr/0041-cache-components-decision.md)）。器は promise のまま渡し、穴の内側で解きます。
 *
 * **登録済みかの判定も穴の内側です。** 送り返す働きは描画の途中でも効き、殻を先に配ったぶん
 * だけ早く判定へ入ります。殻に主体の情報は載りません
 * （[0112](../../../../docs/adr/0112-data-classification-cache-boundary.md)）。
 */
async function PurchaseHistoryContent({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  await requireRegisteredUser(PURCHASE_HISTORY_PATH);

  return <PurchaseHistoryPageContent searchParams={await searchParams} />;
}

export default function PurchaseHistoryPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
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
      <Suspense fallback={<PurchaseHistorySkeleton />}>
        <PurchaseHistoryContent searchParams={searchParams} />
      </Suspense>
    </ContentContainer>
  );
}
