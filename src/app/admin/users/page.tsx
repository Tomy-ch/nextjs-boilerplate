import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { type RawSearchParams, toAdminUserListLocation } from "@/features/admin/users/query";
import { AdminUserResults } from "@/features/admin/users/results";
import { AdminUserListSkeleton } from "@/features/admin/users/ui/skeleton/skeleton";
import { AdminUserListView } from "@/features/admin/users/view";

import { withdrawUserAction } from "./actions";

export const metadata: Metadata = {
  title: "利用者一覧",
  robots: { index: false, follow: false },
};

/**
 * 利用者を一覧で見る画面。
 *
 * @remarks
 * 待機の境界を一覧本体だけに掛けます。絞り込みは取得を待たずに描けるため、範囲を変えるたびに
 * 欄ごと消えると選び直した先が見えません。
 */
export default async function AdminUserListPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const location = toAdminUserListLocation(await searchParams);

  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>利用者一覧</PageHeaderTitle>
          <PageHeaderDescription>
            登録されている利用者を確認し、退会させます。
          </PageHeaderDescription>
        </div>
      </PageHeader>
      <AdminUserListView scope={location.scope}>
        <Suspense fallback={<AdminUserListSkeleton />} key={`${location.scope}-${location.page}`}>
          <AdminUserResults location={location} withdrawAction={withdrawUserAction} />
        </Suspense>
      </AdminUserListView>
    </ContentContainer>
  );
}
