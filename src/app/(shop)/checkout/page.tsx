import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { requireRegisteredUser } from "@/features/account/registration-gate";
import { CheckoutConfirmPageContent } from "@/features/checkout/confirm/page-content";
import { CheckoutConfirmSkeleton } from "@/features/checkout/confirm/ui/skeleton/skeleton";
import { CHECKOUT_PATH } from "@/features/checkout/paths";

export const metadata: Metadata = {
  title: "購入確認",
  description: "お届け先と注文内容を確かめて、注文を確定できます。",
};

/**
 * 購入確認。
 *
 * @remarks
 * 認証の内側にあります。確定認可をここで通すのは、`proxy.ts` の判定が cookie を読むだけの
 * 前捌きで、防御線ではないためです（[0079](../../../../docs/adr/0079-auth-frontend-seam.md)）。
 * 登録がまだの主体も止めます。購入を結び付ける先の利用者がまだ無いためです。
 *
 * 取得も組み立ても持ちません。route と feature をつなぐだけの薄い層です
 * （[0040](../../../../docs/adr/0040-routing-rendering-strategy.md)）。
 */
/**
 * 購入確認の中身。
 *
 * @remarks
 * **登録済みかの判定を穴の内側で行います。** 器の側で待つと、待っている間は殻すら配れません
 * （[0041](../../../../docs/adr/0041-cache-components-decision.md)）。送り返す働きは描画の途中でも効き、殻に主体の情報は載りません
 * （[0112](../../../../docs/adr/0112-data-classification-cache-boundary.md)）。
 */
async function CheckoutConfirmContent() {
  await requireRegisteredUser(CHECKOUT_PATH);

  return <CheckoutConfirmPageContent />;
}

export default function CheckoutPage() {
  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>購入確認</PageHeaderTitle>
          <PageHeaderDescription>
            内容を確かめて注文を確定します。確定するまで購入は成立しません。
          </PageHeaderDescription>
        </div>
      </PageHeader>
      <Suspense fallback={<CheckoutConfirmSkeleton />}>
        <CheckoutConfirmContent />
      </Suspense>
    </ContentContainer>
  );
}
