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
 * 履歴の中身。
 *
 * @remarks
 * **取得と判定を解くのはここです。** 器の側で待つと、待っている間は殻すら配れません
 * （[0041](../../../../docs/adr/0041-cache-components-decision.md)）。器は promise のまま渡し、穴の内側で解きます。
 *
 * **登録済みかの判定も穴の内側です。** 殻に主体の情報は載りません
 * （[0112](../../../../docs/adr/0112-data-classification-cache-boundary.md)）。
 *
 * **送り返しは殻を配り終えた後になります。** 応答は既に 200 で出ているため、転送は
 * `Location` ヘッダではなく meta タグで伝わります。未認証の来訪は `proxy.ts` が入口で
 * 本物の転送として捌くので、ここまで届くのは「認証済みだが登録が済んでいない」場合だけです
 * （[0079](../../../../docs/adr/0079-auth-frontend-seam.md)）。登録の有無はバックエンドに問わないと
 * 分からず、入口では判定できません。
 */
async function PurchaseHistoryContent({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  await requireRegisteredUser(PURCHASE_HISTORY_PATH);

  return <PurchaseHistoryPageContent searchParams={await searchParams} />;
}

/**
 * 購入履歴。
 *
 * @remarks
 * 確定認可をここで通します。`proxy.ts` の判定は前捌きです（[0079](../../../../docs/adr/0079-auth-frontend-seam.md)）。
 *
 * パンくずは置きません。global nav がこの画面を直接指しており、階層が 1 段だからです
 * （[0026](../../../../docs/adr/0026-layout-shell-mount.md)）。
 */
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
