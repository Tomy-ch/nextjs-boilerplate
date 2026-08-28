import { Suspense } from "react";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import { ProductDetailPageContent } from "@/features/products/detail/page-content";
import { ProductDetailSkeleton } from "@/features/products/detail/ui/skeleton/skeleton";

/**
 * 商品の中身。
 *
 * @remarks
 * **取得と判定を解くのはここです。** 器の側で待つと、待っている間は殻すら配れません
 * （[0041](../../../../../docs/adr/0041-cache-components-decision.md)）。器は promise のまま渡し、穴の内側で解きます。
 *
 * **存在しない ID でも 200 が返ります。** 殻を先に流すため、`notFound()` に達した時点で応答の
 * ヘッダは出ています。書き方では解けないので、見つからないことは画面と `noindex` が伝えます
 * （[0080](../../../../../docs/adr/0080-error-handling.md) §4）。
 */
async function ProductDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ProductDetailPageContent id={id} />;
}

/**
 * 商品詳細の route segment。
 *
 * @remarks
 * 取得も組み立ても持ちません。route と feature をつなぐだけの薄い層です
 * （[0040](../../../../../docs/adr/0040-routing-rendering-strategy.md)）。
 */
export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ContentContainer className="py-8">
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetailContent params={params} />
      </Suspense>
    </ContentContainer>
  );
}
