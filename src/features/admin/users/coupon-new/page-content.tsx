import { notFound } from "next/navigation";

import { getProductCategories } from "@/adapters/server/api/product-masters";
import { getManagedUser } from "@/adapters/server/api/users";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import type { ManagedUser, UserId } from "@/model/user/user";
import { withScreenSpan } from "@/observability/render-span";

import { toMasterOptions } from "../../master-option";
import type { IssueCouponAction } from "./form-state";
import { toIssueRecipient } from "./recipient";
import { AdminUserCouponNewView } from "./view";

export type AdminUserCouponNewPageContentProps = {
  id: UserId;
  issueAction: IssueCouponAction;
};

async function loadRecipient(id: UserId): Promise<ManagedUser> {
  try {
    return await getManagedUser(id);
  } catch (error) {
    if (findAppError(error)?.kind === ErrorKind.NOT_FOUND) {
      notFound();
    }

    throw error;
  }
}

export const AdminUserCouponNewPageContent = withScreenSpan(
  "features/admin/users/coupon-new/page-content",
  async ({ id, issueAction }: AdminUserCouponNewPageContentProps) => {
    const [user, categories] = await Promise.all([loadRecipient(id), getProductCategories()]);

    return (
      <AdminUserCouponNewView
        categoryOptions={toMasterOptions(categories)}
        issueAction={issueAction}
        recipient={toIssueRecipient(user)}
      />
    );
  },
);
