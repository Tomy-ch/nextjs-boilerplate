import { getProductCategories } from "@/adapters/server/api/product-masters";
import { newIdempotencyKey } from "@/model/idempotency-key";
import { withScreenSpan } from "@/observability/render-span";

import { toMasterOptions } from "../../master-option";
import type { CreateCampaignAction } from "./form-state";
import { AdminCampaignCreateView } from "./view";

/** `AdminCampaignCreatePageContent` の props。 */
export type AdminCampaignCreatePageContentProps = {
  /** 定義の送信先。 */
  createAction: CreateCampaignAction;
};

/**
 * キャンペーンを定義する画面に要るものを揃える。
 *
 * @remarks
 * **冪等キーは組み立てるたびに 1 つ作ります。** 同じ画面からの再送は同じキーで初回の結果へ
 * 畳み、成立して一覧へ移った後に開き直した画面は別のキーで別の定義を送ります。
 *
 * @param props - 定義の送信先。
 */
export const AdminCampaignCreatePageContent = withScreenSpan(
  "features/admin/campaigns/new/page-content",
  async ({ createAction }: AdminCampaignCreatePageContentProps) => {
    const categories = await getProductCategories();

    return (
      <AdminCampaignCreateView
        categoryOptions={toMasterOptions(categories)}
        createAction={createAction}
        idempotencyKey={newIdempotencyKey()}
      />
    );
  },
);
