import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { ProductListPageContent } from "@/features/products/list/page-content";
import type { RawSearchParams } from "@/features/products/list/query";
import { ProductListSkeleton } from "@/features/products/list/ui/skeleton/skeleton";

export const metadata: Metadata = {
  title: "商品一覧",
  description: "取り扱っている商品を検索して一覧で確認できます。",
};

/**
 * 商品一覧。
 *
 * @remarks
 * 取得も組み立ても持ちません。route と feature をつなぐだけの薄い層です
 * （[0040](../../../../docs/adr/0040-routing-rendering-strategy.md)）。
 *
 * `Suspense` を検索欄より内側ではなく中身の全体に掛けているのは、条件が変われば一覧が
 * 総入れ替えになるためです。見出しと枠は待たずに出ます。
 */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;

  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>商品一覧</PageHeaderTitle>
          <PageHeaderDescription>取り扱っている商品を検索できます。</PageHeaderDescription>
        </div>
      </PageHeader>
      <Suspense key={JSON.stringify(params)} fallback={<ProductListSkeleton />}>
        <ProductListPageContent searchParams={params} />
      </Suspense>
    </ContentContainer>
  );
}
