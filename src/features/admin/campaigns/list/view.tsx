import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/design-system/action/button/button";
import { withScreenSpan } from "@/observability/render-span";
import { ADMIN_CAMPAIGN_NEW_PATH } from "../../paths";

/** `AdminCampaignListView` の props。 */
export type AdminCampaignListViewProps = {
  /** 一覧本体。取得の仕方で差し替えられるよう外から受け取る。 */
  children: ReactNode;
};

/**
 * 取得を持たず、配布期間の読み方の補足と一覧の置き場所だけを組む管理側のキャンペーン一覧。
 *
 * @remarks
 * 一覧本体は `children` として受け取り、取り直す範囲は [`AdminCampaignResults`](./results.tsx) が
 * 持ちます。
 *
 * **配布期間の終わりの扱いを表の外に書きます。** 期間は終了の時刻ちょうどを含みません。表の欄に
 * 毎行書くと同じ但し書きが並び、書かなければ終了の時刻まで受け取れると読まれます。
 *
 * @param props - 一覧本体
 */
export const AdminCampaignListView = withScreenSpan(
  "features/admin/campaigns/list/view",
  ({ children }: AdminCampaignListViewProps) => {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="min-w-0 flex-1 text-muted-foreground text-sm">
            配布期間は開始日時から終了日時の直前までです。終了日時ちょうどからは受け取れません。
          </p>
          <Button asChild className="shrink-0">
            <Link href={ADMIN_CAMPAIGN_NEW_PATH}>キャンペーンを作成</Link>
          </Button>
        </div>
        {children}
      </div>
    );
  },
);
