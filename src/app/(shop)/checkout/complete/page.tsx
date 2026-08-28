import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { CheckoutCompletePageContent } from "@/features/checkout/complete/page-content";
import { CheckoutCompleteSkeleton } from "@/features/checkout/complete/ui/skeleton/skeleton";
import type { RawSearchParams } from "@/model/search-params";

export const metadata: Metadata = {
  title: "購入完了",
  description: "確定した注文の控えと内訳を確認できます。",
};

/**
 * 購入完了。
 *
 * @remarks
 * 取得も組み立ても持ちません。route と feature をつなぐだけの薄い層です
 * （[0040](../../../../../docs/adr/0040-routing-rendering-strategy.md)）。
 *
 * `loading.tsx` を置いていません。置くと応答が streaming になり、指し先の無い URL でも 200 が
 * 返ってしまいます。1 件の取得だけを待つ画面では、待機表示より正しいステータスを優先します。
 */
/**
 * 控えの中身。
 *
 * @remarks
 * **取得と判定を解くのはここです。** 器の側で待つと、待っている間は殻すら配れません
 * （[0041](../../../../../docs/adr/0041-cache-components-decision.md)）。器は promise のまま渡し、穴の内側で解きます。
 */
async function CheckoutCompleteContent({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  return <CheckoutCompletePageContent searchParams={await searchParams} />;
}

export default function CheckoutCompletePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>購入完了</PageHeaderTitle>
          <PageHeaderDescription>
            ご注文を承りました。控えは後からも確認できます。
          </PageHeaderDescription>
        </div>
      </PageHeader>
      <Suspense fallback={<CheckoutCompleteSkeleton />}>
        <CheckoutCompleteContent searchParams={searchParams} />
      </Suspense>
    </ContentContainer>
  );
}
