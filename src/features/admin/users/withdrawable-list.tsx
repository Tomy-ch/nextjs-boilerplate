"use client";

import { type ReactNode, useActionState, useCallback, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/design-system/status/alert/alert";
import { idleActionState } from "@/model/action-state";

import type { WithdrawUserAction, WithdrawUserState } from "./form-state";
import type { AdminUserRow } from "./row";
import { AdminUserTable } from "./ui/table/table";
import { UserWithdrawDialog } from "./ui/withdraw-dialog/withdraw-dialog";

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
 * **送信の結果をここが持ちます。**確認の面は成立と同時に閉じるため、結果をその中に出すと消えます。
 * 一覧の上に置くことで、退会した行が消えた（「有効」で絞り込んでいるとき）後でも何が起きたかが
 * 残ります。
 *
 * 拒まれたときは開いたままにします。理由が判ったうえで「やめる」を選べる状態が要り、閉じてしまう
 * と押し直すところから始まります。
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

  // 成立したら確認を閉じる。閉じるのは結果が返ってからで、押した瞬間ではない（送信中に閉じると
  // form ごと外れ、失敗したことが誰にも届かない）。effect にすると閉じる前の描画が一度挟まり、
  // 成立の報せと開いたままの確認が同時に見える。
  if (seenState !== state) {
    setSeenState(state);

    if (state.status === "success") setTarget(null);
  }

  const dismiss = useCallback(() => setTarget(null), []);

  return (
    <div className="space-y-4">
      {state.status === "success" ? (
        <Alert>
          <AlertTitle>{state.value.name} を退会させました</AlertTitle>
          <AlertDescription>
            進行中の購入の取消と在庫の戻しは後から順に進みます。一覧にすぐ反映されないことがあります。
          </AlertDescription>
        </Alert>
      ) : null}
      {state.status === "error" && state.formError !== null ? (
        <Alert variant="destructive">
          <AlertTitle>退会させられませんでした</AlertTitle>
          <AlertDescription>{state.formError}</AlertDescription>
        </Alert>
      ) : null}

      <AdminUserTable items={items} onWithdraw={setTarget} pagination={pagination} />

      <UserWithdrawDialog formAction={formAction} onDismiss={dismiss} target={target} />
    </div>
  );
}
