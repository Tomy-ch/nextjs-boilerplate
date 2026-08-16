import type { Metadata } from "next";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { CartPageContent } from "@/features/cart/page-content";

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
 * **待機の境界を置いていません。** 境界の内側が client 側で解決されず、待機表示のまま止まる
 * 不具合が出ているためです（`#250`）。原因が判るまでは、取得を待ってから画面ごと返します。
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
      <CartPageContent />
    </ContentContainer>
  );
}
