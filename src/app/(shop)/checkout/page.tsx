import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { CheckoutConfirmPageContent } from "@/features/checkout/confirm/page-content";
import { CheckoutConfirmSkeleton } from "@/features/checkout/confirm/ui/skeleton/skeleton";

export const metadata: Metadata = {
  title: "購入確認",
  description: "お届け先と注文内容を確かめて、注文を確定できます。",
};

/**
 * 購入確認。
 *
 * @remarks
 * 認証の内側にあります。未認証で踏んだ場合は `proxy.ts` の判定に乗り、戻り先を持ったまま
 * ログインへ送られます（[0079](../../../../docs/adr/0079-auth-frontend-seam.md)）。
 *
 * 取得も組み立ても持ちません。route と feature をつなぐだけの薄い層です
 * （[0040](../../../../docs/adr/0040-routing-rendering-strategy.md)）。
 */
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
        <CheckoutConfirmPageContent />
      </Suspense>
    </ContentContainer>
  );
}
