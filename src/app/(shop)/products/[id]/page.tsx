import { ContentContainer } from "@/components/shell/content-container/content-container";
import { ProductDetailPageContent } from "@/features/products/detail/product-detail-page-content";

/**
 * 商品詳細の route segment。
 *
 * @remarks
 * 取得も組み立ても持ちません。route と feature をつなぐだけの薄い層です
 * （[0040](../../../../../docs/adr/0040-routing-rendering-strategy.md)）。
 *
 * `loading.tsx` を置いていません。置くと応答が streaming になり、存在しない ID でも 200 が返って
 * しまうためです。1 件の取得だけを待つ画面では、待機表示より正しいステータスを優先します。
 */
export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <ContentContainer className="py-8">
      <ProductDetailPageContent id={id} />
    </ContentContainer>
  );
}
