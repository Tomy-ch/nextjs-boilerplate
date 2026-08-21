"use client";

import { type ReactNode, useActionState, useCallback, useState } from "react";

import { idleActionState } from "@/model/action-state";

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
 * **成否によらず確認を閉じます。**確認は「本当に押すか」を尋ねる面で、結果を語る面ではありません。
 * 拒まれたときだけ開いたままにすると、一覧の上に出した理由が overlay の裏に隔てられ、読むために
 * 一度閉じることになります。
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
  const [target, setTarget] = useState<AdminUserRow | null>(null);
  const [seenState, setSeenState] = useState<WithdrawUserState>(state);

  // 結果が返ったら確認を閉じる。閉じるのは結果が返ってからで、押した瞬間ではない（送信中に閉じる
  // と form ごと外れ、何が起きたかが誰にも届かない）。effect にすると閉じる前の描画が一度挟まり、
  // 報せと開いたままの確認が同時に見える。
  if (seenState !== state) {
    setSeenState(state);

    if (state.status !== "idle") setTarget(null);
  }

  const dismiss = useCallback(() => setTarget(null), []);

  return (
    <div className="space-y-4">
      <WithdrawFeedback state={state} />
      <AdminUserTable items={items} onWithdraw={setTarget} pagination={pagination} />
      <UserWithdrawDialog formAction={formAction} onDismiss={dismiss} target={target} />
    </div>
  );
}
