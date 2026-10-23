import { getCampaignPage } from "@/adapters/server/api/campaigns";
import { toPageCount } from "@/model/pagination";
import { toPageLinks } from "../../page-window";
import { OffsetPagination } from "../../ui/offset-pagination/offset-pagination";
import type { SuspendCampaignAction } from "./form-state";
import { type AdminCampaignListLocation, toCampaignListHref } from "./query";
import { toAdminCampaignRows } from "./row";
import { SuspendableCampaignList } from "./ui/suspendable-list/suspendable-list";

/** `AdminCampaignResults` の props。 */
export type AdminCampaignResultsProps = {
  /** URL が表す、いま見ている場所。 */
  location: AdminCampaignListLocation;
  /** 1 ページに並べる件数。 */
  perPage: number;
  /** 状態の判定の基準にする時刻。 */
  now: Date;
  /** 停止の送信先。 */
  suspendAction: SuspendCampaignAction;
};

/**
 * 1 ページぶんのキャンペーン。
 *
 * @remarks
 * **ページを変えたときに取り直す範囲がここです。**
 *
 * 行への写し（状態の判定と日時の整形）はここで済ませます。client の部品へは整形済みの文字列だけを
 * 渡し、「いま」も日時もブラウザで読み直させません。
 *
 * ページ数は全件数から導きます。契約が返すのは全件数で、何ページあるかは返しません
 * （[`toPageCount`](../../../../model/pagination.ts)）。
 *
 * @param props - いま見ている場所・1 ページの件数・判定の基準時刻・停止の送信先
 */
export async function AdminCampaignResults({
  location,
  now,
  perPage,
  suspendAction,
}: AdminCampaignResultsProps) {
  const page = await getCampaignPage({ page: location.page, perPage });

  return (
    <SuspendableCampaignList
      items={toAdminCampaignRows(page.items, now)}
      pagination={
        <OffsetPagination
          label="キャンペーン一覧のページ送り"
          links={toPageLinks(location.page, toPageCount(page.total, page.perPage), (target) =>
            toCampaignListHref({ page: target }),
          )}
        />
      }
      suspendAction={suspendAction}
    />
  );
}
