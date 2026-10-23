import { z } from "zod";

import { type RawSearchParams, singleValue } from "@/model/search-params";

import { type AdminCampaignListLocation, CAMPAIGN_LIST_KEY, FIRST_PAGE } from "./query";

/**
 * ページ番号を読むスキーマを、契約が許す上限つきで組む。
 *
 * @remarks
 * 上限は契約が決めるため、外から受け取ります（`adapters` が公開する）。**下限だけを見ると、上限を
 * 超えたページ番号がそのまま取得へ渡り、一覧の代わりにエラー面が出ます。**
 *
 * @param pageMax - 契約が許すページ番号の上限
 * @returns ページ番号を読む zod スキーマ
 */
function pageSchema(pageMax: number) {
  return singleValue(z.coerce.number().int().min(FIRST_PAGE).max(pageMax)).catch(FIRST_PAGE);
}

/**
 * 素の `searchParams` を、いま見ている場所として読む。
 *
 * @remarks
 * **URL は利用者が直接編集できます。** 読めないページ番号は先頭へ倒します。契約が拒む値をそのまま
 * 送っても得られるのは `400` だけで、押した人にできることがありません。
 *
 * @param params - 素の `searchParams`
 * @param pageMax - 契約が許すページ番号の上限
 * @returns 検証済みの、いま見ている場所
 */
export function toAdminCampaignListLocation(
  params: RawSearchParams,
  pageMax: number,
): AdminCampaignListLocation {
  return {
    page: pageSchema(pageMax).parse(params[CAMPAIGN_LIST_KEY.PAGE]),
  };
}
