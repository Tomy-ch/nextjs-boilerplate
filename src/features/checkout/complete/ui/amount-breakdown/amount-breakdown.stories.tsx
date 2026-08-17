import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PURCHASE, TOTAL_REFERENCE } from "../../../checkout.fixture";
import { AmountBreakdown } from "./amount-breakdown";

const meta = {
  title: "Features/Checkout/AmountBreakdown",
  component: AmountBreakdown,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "請求額の内訳です。**確定した金額**で、確認の画面で出せたのは小計までです。",
          "参考換算額を添えるのは合計にだけで、内訳のそれぞれに添えるとどれが請求額か読み取れなくなります。",
        ].join(""),
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-80 rounded-lg border p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AmountBreakdown>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 参考換算額を引けた状態。 */
export const WithReference: Story = {
  args: { purchase: PURCHASE, reference: TOTAL_REFERENCE },
};

/** 参考換算額を引けなかった状態。切り替えを出さない。 */
export const WithoutReference: Story = {
  args: { purchase: PURCHASE, reference: null },
};
