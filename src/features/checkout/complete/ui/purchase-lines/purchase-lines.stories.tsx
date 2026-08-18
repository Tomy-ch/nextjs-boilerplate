import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PURCHASE } from "../../../checkout.fixture";
import { PurchaseLines } from "./purchase-lines";

const meta = {
  title: "Features/Checkout/PurchaseLines",
  component: PurchaseLines,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "購入した明細です。**単価は購入した時点の値**で、商品の現在価格が変わっても動きません。",
          "行ごとの金額は出しません —— 掛け算をすると、画面が金額を作ることになります。",
        ].join(""),
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[40rem] max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PurchaseLines>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。 */
export const Default: Story = {
  args: { lines: PURCHASE.lines },
};
