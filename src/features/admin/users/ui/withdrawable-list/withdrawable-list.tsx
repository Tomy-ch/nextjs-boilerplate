"use client";

import { type ReactNode, useActionState } from "react";

import { idleActionState } from "@/model/action-state";

import { useConfirmationTarget } from "../../../use-confirmation-target";
import type { WithdrawUserAction, WithdrawUserState } from "../../form-state";
import type { AdminUserRow } from "../../row";
import { AdminUserTable } from "../table/table";
import { UserWithdrawDialog } from "../withdraw-dialog/withdraw-dialog";
import { WithdrawFeedback } from "../withdraw-feedback/withdraw-feedback";

/** `WithdrawableUserList` の props。 */
export type WithdrawableUserListProps = {
  /** 並べる利用者。 */
  items: readonly AdminUserRow[];
  /** 退会の送信先。 */
  withdrawAction: WithdrawUserAction;
  /** 一覧の下に置くページ送り。 */
  pagination?: ReactNode;
};

/**
 * 退会を確認して送れる利用者一覧。
 *
 * @remarks
 * **退会の始まりと終わりを繋ぐのがここの役目です。**行が「この人を退会させる」と言い、確認の面が
 * 送り、結果が一覧の上に出る —— この 3 つは別々の部品にあり、どれとどれが同じ相手の話かを知って
 * いるのはこの層だけです。
 *
 * 確認を成否によらず閉じる理由は [画面要件](../../../../../../docs/spec/route/admin/users/page.screen.md#confirming-account-closure)。
 *
 * @param props - {@link WithdrawableUserListProps} を参照。
 */
export function WithdrawableUserList({
  items,
  pagination,
  withdrawAction,
}: WithdrawableUserListProps) {
  const [state, formAction] = useActionState<WithdrawUserState, FormData>(
    withdrawAction,
    idleActionState(),
  );
  const { target, confirm, dismiss } = useConfirmationTarget<AdminUserRow>(state);

  return (
    <div className="space-y-4">
      <WithdrawFeedback state={state} />
      <AdminUserTable items={items} onWithdraw={confirm} pagination={pagination} />
      <UserWithdrawDialog formAction={formAction} onDismiss={dismiss} target={target} />
    </div>
  );
}
