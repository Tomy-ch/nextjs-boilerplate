import { getProductCategories } from "@/adapters/server/api/product-masters";
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
      />
    );
  },
);
