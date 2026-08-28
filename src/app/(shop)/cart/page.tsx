import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { CartPageContent } from "@/features/cart/page-content";
import { CartSkeleton } from "@/features/cart/ui/skeleton/skeleton";

export const metadata: Metadata = {
  title: "カート",
  description: "カートに入れた商品の数量を変えたり、取り除いたりできます。",
};

/**
 * カート。
 *
 * @remarks
 * 認証を要しません。未ログインの利用者が中身を全画面で確かめられる唯一の経路であり、ここに
 * 認証を挟むと、脇の領域が出せない幅では中身を確かめる手段が無くなります。
 *
 * 取得も組み立ても持ちません。route と feature をつなぐだけの薄い層です
 * （[0040](../../../../docs/adr/0040-routing-rendering-strategy.md)）。
 *
 * **待機表示を持ちません。** カートは外枠（`(shop)/layout.tsx`）が既に読んでおり、取得は
 * 1 リクエストの中で memo 化されます（`adapters/server/api/cart.ts`）。同時に届くものを別々の
 * 境界へ割ると画面が二度継ぎ足され、読み始めた位置が動きます（[0040](../../../../docs/adr/0040-routing-rendering-strategy.md)
 * の「境界は待つものの単位で置く」）。
 */
export default function CartPage() {
  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>カート</PageHeaderTitle>
          <PageHeaderDescription>
            買えない明細や値の変わった明細は、その行に理由を添えています。
          </PageHeaderDescription>
        </div>
      </PageHeader>
      <Suspense fallback={<CartSkeleton />}>
        <CartPageContent />
      </Suspense>
    </ContentContainer>
  );
}
