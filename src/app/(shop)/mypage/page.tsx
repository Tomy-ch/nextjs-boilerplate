import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { verifySession } from "@/adapters/server/auth/session";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { MypagePageContent } from "@/features/account/mypage/page-content";
import { MypageSkeleton } from "@/features/account/mypage/ui/skeleton/skeleton";
import { MYPAGE_PATH } from "@/features/account/paths";
import { toSafeReturnUrl } from "@/model/return-url";

export const metadata: Metadata = {
  title: "マイページ",
  description: "登録情報と購入の集計を確認できます。",
};

/**
 * マイページ。
 *
 * @remarks
 * 確定認可をここで通します。`proxy.ts` の判定は cookie を読むだけの前捌きで、防御線ではありません
 * （[0079](../../../../docs/adr/0079-auth-frontend-seam.md)）。
 *
 * パンくずは置きません。global nav がこの画面を直接指しており、階層が 1 段だからです
 * （[0026](../../../../docs/adr/0026-layout-shell-mount.md)）。
 */
export default async function MypagePage() {
  if ((await verifySession()) === null) {
    redirect(`/login?returnUrl=${encodeURIComponent(toSafeReturnUrl(MYPAGE_PATH))}`);
  }

  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>マイページ</PageHeaderTitle>
          <PageHeaderDescription>登録情報と購入の集計を確認できます。</PageHeaderDescription>
        </div>
      </PageHeader>
      <Suspense fallback={<MypageSkeleton />}>
        <MypagePageContent />
      </Suspense>
    </ContentContainer>
  );
}
