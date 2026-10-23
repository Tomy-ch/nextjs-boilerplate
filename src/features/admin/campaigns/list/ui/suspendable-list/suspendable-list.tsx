"use client";

import { type ReactNode, useActionState, useCallback } from "react";

import { idleActionState } from "@/model/action-state";

import { useConfirmationTarget } from "../../../../use-confirmation-target";
import type { SuspendCampaignAction, SuspendCampaignState } from "../../form-state";
import type { AdminCampaignRow } from "../../row";
import { useSuspendAttempts } from "../../use-suspend-attempts";
import { CampaignSuspendDialog, type SuspendConfirmation } from "../suspend-dialog/suspend-dialog";
import { SuspendFeedback } from "../suspend-feedback/suspend-feedback";
import { AdminCampaignTable } from "../table/table";

/** `SuspendableCampaignList` の props。 */
export type SuspendableCampaignListProps = {
  /** 並べるキャンペーン。 */
  items: readonly AdminCampaignRow[];
  /** 停止の送信先。 */
  suspendAction: SuspendCampaignAction;
  /** 一覧の下に置くページ送り。 */
  pagination?: ReactNode;
};

/**
 * 停止を確認して送れるキャンペーン一覧。
 *
 * @remarks
 * **停止の始まりと終わりを繋ぐのがここの役目です。** 行が「これを停止する」と言い、確認の面が
 * 送り、結果が一覧の上に出る —— この 3 つは別々の部品にあり、どれとどれが同じ相手の話かを知って
 * いるのはこの層だけです。
 *
 * **冪等キーは行ごとの試みに 1 つで、開閉で unmount しないこの層が持ちます。** 結果が定まらない
 * 失敗の後に同じ行を選び直すと同じ鍵で送り直し、別の行へは別の鍵を使います（`docs/rules.md#forms`）。
 *
 * 確認は成否によらず閉じ、結果は一覧の上に残ります。
 *
 * @param props - {@link SuspendableCampaignListProps} を参照。
 */
export function SuspendableCampaignList({
  items,
  pagination,
  suspendAction,
}: SuspendableCampaignListProps) {
  const [state, formAction] = useActionState<SuspendCampaignState, FormData>(
    suspendAction,
    idleActionState(),
  );
  const {
    target: confirmation,
    confirm: open,
    dismiss,
  } = useConfirmationTarget<SuspendConfirmation>(state);

  const keyFor = useSuspendAttempts(state);

  /** 停止する行を受け取り、その行の試みの冪等キーとともに確認を開く。 */
  const confirm = useCallback(
    (target: AdminCampaignRow) => open({ target, idempotencyKey: keyFor(target.id) }),
    [keyFor, open],
  );

  return (
    <div className="space-y-4">
      <SuspendFeedback state={state} />
      <AdminCampaignTable items={items} onSuspend={confirm} pagination={pagination} />
      <CampaignSuspendDialog
        confirmation={confirmation}
        formAction={formAction}
        onDismiss={dismiss}
      />
    </div>
  );
}
