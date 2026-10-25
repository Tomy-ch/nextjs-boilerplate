import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn, userEvent, within } from "storybook/test";

import { neverSettlingAction } from "~catalog/lib/pending-action";
import { LONG_CODE_CAMPAIGN_ROW, UPCOMING_CAMPAIGN_ROW } from "../../list.fixture";
import { CampaignSuspendDialog } from "./suspend-dialog";

/** 確認に載せる鍵。canvas では送らないので、形が正しい値であれば中身は問わない。 */
const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-8000-00000000a0c1";

/** 確認の中の送信を押す。同じ呼び名が外にも居るので、dialog の内側へ絞る。 */
async function submitSuspend() {
  const dialog = await within(document.body).findByRole("alertdialog");

  await userEvent.click(within(dialog).getByRole("button", { name: "停止する" }));
}

const meta = {
  title: "Features/Admin/Campaigns/List/SuspendDialog",
  component: CampaignSuspendDialog,
  parameters: {
    layout: "fullscreen",
    docs: {
      story: { inline: false, iframeHeight: 420 },
      description: {
        component: [
          "配布を停止する前の確認です。**取り消せないので背景を押しても閉じません。** 本文は、取り消せないことと、すでに配ったクーポンは無効にならないことを書きます。",
          "**この面は trigger を持たず**、開くのは行の操作が選ばれたとき、送信の結果を受けるのも外側です。",
        ].join(""),
      },
    },
  },
  args: {
    confirmation: { target: UPCOMING_CAMPAIGN_ROW, idempotencyKey: IDEMPOTENCY_KEY },
    onDismiss: fn(),
    formAction: neverSettlingAction,
  },
} satisfies Meta<typeof CampaignSuspendDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 確認を開いた状態。やめる側が既定の位置に立つ。 */
export const Open: Story = {};

/** 送信中。確認は開いたまま留まり、結果が返ってから外側が閉じる。 */
export const Submitting: Story = {
  play: submitSuspend,
};

/** 長いコード。見出しが折り返しても本文と操作の位置は動かない。 */
export const LongCode: Story = {
  args: { confirmation: { target: LONG_CODE_CAMPAIGN_ROW, idempotencyKey: IDEMPOTENCY_KEY } },
};
