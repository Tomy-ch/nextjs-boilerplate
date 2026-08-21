import type { Metadata } from "next";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { AdminUserListPageContent } from "@/features/admin/users/page-content";
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
export default async function AdminUserListPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;

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
      <AdminUserListPageContent searchParams={params} withdrawAction={withdrawUserAction} />
    </ContentContainer>
  );
}
