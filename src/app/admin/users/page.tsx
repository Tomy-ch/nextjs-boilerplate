import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { AdminUserListPageContent } from "@/features/admin/users/page-content";
import { AdminUserListSkeleton } from "@/features/admin/users/ui/skeleton/skeleton";
import type { RawSearchParams } from "@/model/search-params";
import { withdrawUserAction } from "./actions";

export const metadata: Metadata = {
  title: "利用者一覧",
  robots: { index: false, follow: false },
};

/**
 * 利用者を一覧で見る画面。
 *
 * @remarks
 * 検索エンジンに拾わせません。管理の面は認可の内側にあり、索引に載っても辿り着けないうえ、
 * 存在だけが外へ出ます（[0044](../../../../docs/adr/0044-seo-metadata-strategy.md)）。
 */
/**
 * 一覧の中身。
 *
 * @remarks
 * **`searchParams` を解くのはここです。** 器の側で待つと、待っている間は殻すら配れません
 * （[0041](../../../../docs/adr/0041-cache-components-decision.md)）。器は promise のまま渡し、穴の内側で解きます。
 */
async function AdminUserListContent({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return (
    <AdminUserListPageContent
      searchParams={await searchParams}
      withdrawAction={withdrawUserAction}
    />
  );
}

export default function AdminUserListPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
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
      <Suspense fallback={<AdminUserListSkeleton />}>
        <AdminUserListContent searchParams={searchParams} />
      </Suspense>
    </ContentContainer>
  );
}
