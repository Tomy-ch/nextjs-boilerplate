import { Suspense } from "react";

import { MANAGED_USER_PAGE_MAX } from "@/adapters/server/api/users";
import type { RawSearchParams } from "@/model/search-params";
import type { WithdrawUserAction } from "./form-state";
import { ADMIN_USER_PAGE_SIZE } from "./page-size";

import { toAdminUserListLocation } from "./read-location";
import { AdminUserResults } from "./results";
import { AdminUserListSkeleton } from "./ui/skeleton/skeleton";
import { AdminUserListView } from "./view";

/** `AdminUserListPageContent` の props。 */
export type AdminUserListPageContentProps = {
  /** route が受け取った素の検索条件。 */
  searchParams: RawSearchParams;
  /** 退会の送信先。 */
  withdrawAction: WithdrawUserAction;
};

/**
 * 利用者一覧の URL 解釈と画面の組み立て。
 *
 * @remarks
 * **取り直す範囲をここで区切ります。** 待機の境界を一覧本体だけに掛けるため、絞り込みの欄は取得を
 * 待たずに描かれます。欄ごと消えると、範囲を選び直した先が見えません。
 *
 * **場所が変わったら作り直します**（`key`）。同じ位置に留まったまま中身だけ入れ替わると、前の
 * ページの行が新しい待機の下に残ります。
 *
 * ページ番号の上限は取得の口が公開するものを渡します。契約の宣言に触れてよいのは `adapters` まで
 * で、この層が値を書き写すと契約が変わったときにここだけが古い上限を持ちます。
 */
export function AdminUserListPageContent({
  searchParams,
  withdrawAction,
}: AdminUserListPageContentProps) {
  const location = toAdminUserListLocation(searchParams, MANAGED_USER_PAGE_MAX);

  return (
    <AdminUserListView scope={location.scope}>
      <Suspense fallback={<AdminUserListSkeleton />} key={`${location.scope}-${location.page}`}>
        <AdminUserResults
          location={location}
          perPage={ADMIN_USER_PAGE_SIZE}
          withdrawAction={withdrawAction}
        />
      </Suspense>
    </AdminUserListView>
  );
}
