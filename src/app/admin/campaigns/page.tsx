import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { getClockConfig } from "@/config/clock/clock.server";
import { AdminCampaignListPageContent } from "@/features/admin/campaigns/list/page-content";
import { AdminCampaignListSkeleton } from "@/features/admin/campaigns/list/ui/skeleton/skeleton";
import type { RawSearchParams } from "@/model/search-params";
import { suspendCampaignAction } from "./actions";

export const metadata: Metadata = {
  title: "キャンペーン一覧",
  robots: { index: false, follow: false },
};

/**
 * 一覧の中身。
 *
 * @remarks
 * **`searchParams` を解くのはここです。** 器の側で待つと、待っている間は殻すら配れません。
 *
 * **「いま」もここで読みます。** 実時計はプリレンダーの最中には値が定まらないため、`connection()`
 * を待って「要求のときに描く」ことを確定させてから読みます。
 */
async function AdminCampaignListContent({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolved = await searchParams;

  await connection();

  return (
    <AdminCampaignListPageContent
      now={getClockConfig().now()}
      searchParams={resolved}
      suspendAction={suspendCampaignAction}
    />
  );
}

/**
 * キャンペーンを一覧で見る画面。
 *
 * @remarks
 * 索引に載せない理由は `docs/spec/route/admin/layout.function.md#keep-out-of-search-indexes`。
 *
 * **「いま」を route で読んで渡します。** 配布の状態は「いま」と突き合わせて決まり、実時計を読む
 * 場所が `features` の中にあると検証で固定できません（`config/clock`）。
 */
export default function AdminCampaignListPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>キャンペーン一覧</PageHeaderTitle>
          <PageHeaderDescription>
            クーポンを配るキャンペーンの配布状況を確認し、配布を停止します。
          </PageHeaderDescription>
        </div>
      </PageHeader>
      <Suspense fallback={<AdminCampaignListSkeleton />}>
        <AdminCampaignListContent searchParams={searchParams} />
      </Suspense>
    </ContentContainer>
  );
}
