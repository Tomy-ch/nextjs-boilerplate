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
import { ProfileEditPageContent } from "@/features/account/edit/page-content";
import { ProfileEditSkeleton } from "@/features/account/edit/ui/skeleton/skeleton";
import { PROFILE_EDIT_PATH } from "@/features/account/paths";
import { toSafeReturnUrl } from "@/model/return-url";

export const metadata: Metadata = {
  title: "プロフィール編集",
  description: "登録情報を変更できます。",
};

/**
 * プロフィール編集。
 *
 * @remarks
 * マイページとは独立したルートです。1 つの画面に表示と編集を同居させると、どちらの状態で
 * 開いているかが URL から失われ、戻る操作も共有もできなくなります。
 */
export default async function ProfileEditPage() {
  if ((await verifySession()) === null) {
    redirect(`/login?returnUrl=${encodeURIComponent(toSafeReturnUrl(PROFILE_EDIT_PATH))}`);
  }

  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>プロフィール編集</PageHeaderTitle>
          <PageHeaderDescription>登録情報を変更できます。</PageHeaderDescription>
        </div>
      </PageHeader>
      <Suspense fallback={<ProfileEditSkeleton />}>
        <ProfileEditPageContent />
      </Suspense>
    </ContentContainer>
  );
}
