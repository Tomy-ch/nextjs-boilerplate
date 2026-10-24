import { ADMIN_CAMPAIGN_LIST_PATH } from "../../paths";

/** ページ位置を載せる URL のキー。読む側（`read-location.ts`）と組む側が共有する。 */
export const CAMPAIGN_LIST_KEY: Readonly<{ PAGE: "page" }> = {
  PAGE: "page",
};

/** 一覧の先頭ページ。読めないページ番号はここへ倒す。 */
export const FIRST_PAGE = 1;

/**
 * 一覧の URL が表す、いま見ている場所。
 *
 * @remarks
 * 絞り込みを持ちません。契約の一覧が受け取るのはページ位置と件数だけです。
 */
export type AdminCampaignListLocation = {
  /** 1 から数えるページ番号。 */
  readonly page: number;
};

/**
 * 一覧の URL を組む。
 *
 * @remarks
 * 既定の値は載せません。`?page=1` と `/admin/campaigns` は同じ場所を指しており、両方が出回ると
 * 同じ一覧に 2 つの住所ができます。
 *
 * @param location - 組む先の URL が表す場所
 * @returns 組んだ URL
 */
export function toCampaignListHref(location: AdminCampaignListLocation): string {
  if (location.page <= FIRST_PAGE) return ADMIN_CAMPAIGN_LIST_PATH;

  const params = new URLSearchParams({ [CAMPAIGN_LIST_KEY.PAGE]: location.page.toString() });

  return `${ADMIN_CAMPAIGN_LIST_PATH}?${params.toString()}`;
}
