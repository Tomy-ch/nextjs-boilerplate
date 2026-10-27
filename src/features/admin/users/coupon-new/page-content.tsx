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
  /** URL が名指しした受給者。 */
  id: UserId;
  /** 発行を送る Server Action。 */
  issueAction: IssueCouponAction;
};

/**
 * 受給者を読む。
 *
 * @param id - URL が名指しした受給者
 * @returns 読んだ利用者。退会済みも返す
 * @throws 見つからなければ not-found の面へ移る
 */
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

/**
 * 利用者 1 人にクーポンを発行する画面の中身。受給者と、範囲に選べるカテゴリを読む。
 *
 * @remarks
 * 存在しない受給者は not-found の面へ移します。退会済みの受給者はフォームを出さない面で
 * 示すため、ここでは読んだまま渡します。
 */
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
