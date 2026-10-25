import { Suspense } from "react";

import { CAMPAIGN_PAGE_MAX } from "@/adapters/server/api/campaigns";
import type { RawSearchParams } from "@/model/search-params";
import { withScreenSpan } from "@/observability/render-span";
import type { SuspendCampaignAction } from "./form-state";
import { ADMIN_CAMPAIGN_PAGE_SIZE } from "./page-size";
import { toAdminCampaignListLocation } from "./read-location";
import { AdminCampaignResults } from "./results";
import { AdminCampaignListSkeleton } from "./ui/skeleton/skeleton";
import { AdminCampaignListView } from "./view";

/** `AdminCampaignListPageContent` の props。 */
export type AdminCampaignListPageContentProps = {
  /** route が受け取った素の検索条件。 */
  searchParams: RawSearchParams;
  /** 状態の判定の基準にする時刻。route が読んで渡す。 */
  now: Date;
  /** 停止の送信先。 */
  suspendAction: SuspendCampaignAction;
};

/**
 * キャンペーン一覧の URL 解釈と画面の組み立て。
 *
 * @remarks
 * **取り直す範囲をここで区切ります。** 待機の境界を一覧本体だけに掛けるため、配布期間の補足は
 * 取得を待たずに描かれます。
 *
 * **場所が変わったら作り直します**（`key`）。同じ位置に留まったまま中身だけ入れ替わると、前の
 * ページの行が新しい待機の下に残ります。
 *
 * ページ番号の上限は取得の口が公開するものを渡します。契約の宣言に触れてよいのは `adapters` まで
 * です。
 *
 * **「いま」は受け取ります。** `features` は `config` を読めず、時計を読む場所は検証で固定できる
 * route に置きます。
 *
 * @param props - 画面が受け取った検索条件・判定の基準時刻・停止の送信先
 */
export const AdminCampaignListPageContent = withScreenSpan(
  "features/admin/campaigns/list/page-content",
  ({ now, searchParams, suspendAction }: AdminCampaignListPageContentProps) => {
    const location = toAdminCampaignListLocation(searchParams, CAMPAIGN_PAGE_MAX);

    return (
      <AdminCampaignListView>
        <Suspense fallback={<AdminCampaignListSkeleton />} key={location.page}>
          <AdminCampaignResults
            location={location}
            now={now}
            perPage={ADMIN_CAMPAIGN_PAGE_SIZE}
            suspendAction={suspendAction}
          />
        </Suspense>
      </AdminCampaignListView>
    );
  },
);
