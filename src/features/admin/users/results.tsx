import { getManagedUserPage } from "@/adapters/server/api/users";
import { toPageCount } from "@/model/pagination";

import type { WithdrawUserAction } from "./form-state";
import { type AdminUserListLocation, toActiveParam } from "./query";
import { toAdminUserRows } from "./row";
import { AdminUserPagination } from "./ui/pagination/pagination";
import { WithdrawableUserList } from "./ui/withdrawable-list/withdrawable-list";

/** `AdminUserResults` の props。 */
export type AdminUserResultsProps = {
  /** URL が表す、いま見ている場所。 */
  location: AdminUserListLocation;
  /** 退会の送信先。 */
  withdrawAction: WithdrawUserAction;
};

/**
 * 条件に一致する 1 ページぶんの利用者。
 *
 * @remarks
 * **範囲やページを変えたときに取り直す範囲がここです。** 絞り込みの欄は外側にあり、取り直しの
 * 待機表示に巻き込まれません。
 *
 * ページ数は全件数から導きます。契約が返すのは位置と全件数で、何ページあるかは返しません
 * （[`toPageCount`](../../../model/pagination.ts)）。
 */
export async function AdminUserResults({ location, withdrawAction }: AdminUserResultsProps) {
  const active = toActiveParam(location.scope);
  const page = await getManagedUserPage({
    page: location.page,
    ...(active === undefined ? {} : { active }),
  });

  return (
    <WithdrawableUserList
      items={toAdminUserRows(page.items)}
      pagination={
        <AdminUserPagination
          location={location}
          pageCount={toPageCount(page.total, page.perPage)}
        />
      }
      withdrawAction={withdrawAction}
    />
  );
}
