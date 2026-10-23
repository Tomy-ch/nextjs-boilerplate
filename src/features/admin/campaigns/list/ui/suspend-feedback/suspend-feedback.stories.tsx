import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ErrorKind } from "@/errors/error-kind";
import { failedActionState, succeededActionState } from "@/model/action-state";
import {
  SUSPEND_CONFLICT_MESSAGE,
  SUSPEND_TARGET_LOST_MESSAGE,
  type SuspendCampaignState,
} from "../../form-state";
import { SuspendFeedback } from "./suspend-feedback";

const SUCCEEDED: SuspendCampaignState = succeededActionState({ code: "SPRING2026" });

const CONFLICTED: SuspendCampaignState = failedActionState({
  formError: `SPRING2026 は${SUSPEND_CONFLICT_MESSAGE}`,
  kind: ErrorKind.CONFLICT,
});

const TARGET_LOST: SuspendCampaignState = failedActionState({
  formError: SUSPEND_TARGET_LOST_MESSAGE,
});

const meta = {
  title: "Features/Admin/Campaigns/List/SuspendFeedback",
  component: SuspendFeedback,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "配布を停止した結果の報せです。**一覧の上に 1 つだけ置きます** —— 確認の面は結果が返ると閉じ、行ごとに置くとどれが最新か判らないためです。",
          "成立の報せには、配ったクーポンは無効にならないことを添えます。まだ何も送っていない状態では何も描きません。",
        ].join(""),
      },
    },
  },
  args: { state: SUCCEEDED },
} satisfies Meta<typeof SuspendFeedback>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 成立した状態。どれを停止したかと、配ったクーポンは無効にならないことを添える。 */
export const Succeeded: Story = {};

/** 既に停止されていて拒まれた状態。一覧は取り直されたことを添える。 */
export const Conflicted: Story = {
  args: { state: CONFLICTED },
};

/** 対象が送られてこなかった状態。開き直す先を文言が示す。 */
export const TargetLost: Story = {
  args: { state: TARGET_LOST },
};
