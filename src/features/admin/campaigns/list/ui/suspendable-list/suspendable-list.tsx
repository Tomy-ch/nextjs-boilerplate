"use client";

import { type ReactNode, useCallback } from "react";

import { idleActionState } from "@/model/action-state";

import { useConfirmationTarget } from "../../../../use-confirmation-target";
import { useRowActionState } from "../../../../use-row-action-state";
import { SUSPEND_FORM_NAMES } from "../../form-names";
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
 * **冪等キーは行ごとの試みに 1 つで、開閉で unmount しないこの層が持ちます。** 鍵の保ち方は
 * `useSuspendAttempts` が、結果がどの行に答えたかは `useRowActionState` が持ちます。
 *
 * 確認はその行の結果が返ると成否によらず閉じ、結果は一覧の上に残ります。
 *
 * @param props - {@link SuspendableCampaignListProps} を参照。
 */
export function SuspendableCampaignList({
  items,
  pagination,
  suspendAction,
}: SuspendableCampaignListProps) {
  const [answer, formAction] = useRowActionState<SuspendCampaignState>(
    suspendAction,
    idleActionState(),
    SUSPEND_FORM_NAMES.campaignId,
  );
  const keyFor = useSuspendAttempts(answer);
  const {
    target: confirmation,
    confirm: open,
    dismiss,
  } = useConfirmationTarget<SuspendConfirmation>(
    answer.result,
    (current) => current.target.id === answer.row,
  );

  /** 停止する行を受け取り、その行の試みの冪等キーとともに確認を開く。 */
  const confirm = useCallback(
    (target: AdminCampaignRow) => open({ target, idempotencyKey: keyFor(target.id) }),
    [keyFor, open],
  );

  return (
    <div className="space-y-4">
      <SuspendFeedback state={answer.result} />
      <AdminCampaignTable items={items} onSuspend={confirm} pagination={pagination} />
      <CampaignSuspendDialog
        confirmation={confirmation}
        formAction={formAction}
        onDismiss={dismiss}
      />
    </div>
  );
}
