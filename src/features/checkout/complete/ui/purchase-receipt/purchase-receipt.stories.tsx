import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PURCHASE } from "../../../checkout.fixture";
import { PurchaseReceipt } from "./purchase-receipt";

const meta = {
  title: "Features/Checkout/PurchaseReceipt",
  component: PurchaseReceipt,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "購入の控えです。見せる識別子は**注文番号（購入コード）**で、",
          "取得に使う ID は利用者が持ち出せる値ではないため画面に出しません。",
        ].join(""),
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[32rem] max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PurchaseReceipt>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 確定した直後の状態。 */
export const Default: Story = {
  args: { purchase: PURCHASE },
};
