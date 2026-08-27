import type { Metadata } from "next";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { CheckoutCompletePageContent } from "@/features/checkout/complete/page-content";
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
export default async function CheckoutCompletePage({
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
      <CheckoutCompletePageContent searchParams={await searchParams} />
    </ContentContainer>
  );
}
