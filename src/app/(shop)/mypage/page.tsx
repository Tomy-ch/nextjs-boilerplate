import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { MypagePageContent } from "@/features/account/mypage/page-content";
import { MypageSkeleton } from "@/features/account/mypage/ui/skeleton/skeleton";
import { MYPAGE_PATH } from "@/features/account/paths";
import { requireRegisteredUser } from "@/features/account/registration-gate";

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
/**
 * マイページの中身。
 *
 * @remarks
 * **登録済みかの判定を穴の内側で行います。** 器の側で待つと、待っている間は殻すら配れません
 * （[0041](../../../../docs/adr/0041-cache-components-decision.md)）。送り返す働きは描画の途中でも効き、殻に主体の情報は載りません
 * （[0112](../../../../docs/adr/0112-data-classification-cache-boundary.md)）。
 */
async function MypageContent() {
  await requireRegisteredUser(MYPAGE_PATH);

  return <MypagePageContent />;
}

export default function MypagePage() {
  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>マイページ</PageHeaderTitle>
          <PageHeaderDescription>登録情報と購入の集計を確認できます。</PageHeaderDescription>
        </div>
      </PageHeader>
      <Suspense fallback={<MypageSkeleton />}>
        <MypageContent />
      </Suspense>
    </ContentContainer>
  );
}
