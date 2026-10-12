import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn, userEvent, within } from "storybook/test";

import { neverSettlingAction } from "~catalog/lib/pending-action";
import {
  DISCONTINUE_PRODUCT,
  LONG_NAME_DISCONTINUE_PRODUCT,
  OPEN_IMPACT,
} from "../../discontinue.fixture";
import { DiscontinueConfirmDialog } from "./confirm-dialog";

/** 確認の中の送信を押す。 */
async function submitDiscontinue() {
  const dialog = await within(document.body).findByRole("alertdialog");

  await userEvent.click(within(dialog).getByRole("button", { name: "廃番にする" }));
}

const meta = {
  title: "Features/Admin/Products/Discontinue/ConfirmDialog",
  component: DiscontinueConfirmDialog,
  parameters: {
    layout: "fullscreen",
    docs: {
      story: { inline: false, iframeHeight: 480 },
      description: {
        component: [
          "廃番にする前の確認です。**不可逆なので背景を押しても閉じません。** 本文は、戻せないこと・",
          "カートの明細は消えず理由が出ること・見積もり時点で何人にどの条件のクーポンが出るかを先に書きます。",
          "**この面は trigger を持たず**、結果を受けて閉じるかどうかを決めるのも外側です。",
        ].join(""),
      },
    },
  },
  args: {
    open: true,
    onDismiss: fn(),
    formAction: neverSettlingAction,
    product: DISCONTINUE_PRODUCT,
    values: { couponDiscountRate: "10", couponValidityDays: "30" },
    estimatedUserCount: OPEN_IMPACT.affectedUserCount,
    idempotencyKey: "0195f0c2-0000-7000-a000-000000000001",
    failures: [],
  },
} satisfies Meta<typeof DiscontinueConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 確認を開いた状態。やめる側が既定の位置に立つ。 */
export const Open: Story = {};

/** 送信中。確認は開いたまま留まる。 */
export const Submitting: Story = {
  play: submitDiscontinue,
};

/** 確認の中で失敗した状態。押した場所から目を離させず、中に理由を出す。 */
export const Failed: Story = {
  args: { failures: ["値引き率は受け付けられませんでした。入力し直してください。"] },
};

/** 名前が長い商品。見出しが折り返しても本文と操作の位置は動かない。 */
export const LongName: Story = {
  args: { product: LONG_NAME_DISCONTINUE_PRODUCT },
};
