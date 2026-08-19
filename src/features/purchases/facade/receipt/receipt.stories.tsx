import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PURCHASE_DETAIL } from "../purchase.fixture";
import { PurchaseReceiptCard } from "./receipt";

const meta = {
  title: "Features/Purchases/ReceiptCard",
  component: PurchaseReceiptCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "購入の控えです。見せる識別子は**購入コード**で、取得に使う ID は画面に出しません。",
          "問い合わせに持ち出せる値かどうかが違います。",
        ].join(""),
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PurchaseReceiptCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。 */
export const Default: Story = {
  args: { purchase: PURCHASE_DETAIL },
};

/** キャンセル済み。状況の名称はバックエンドが解決した値をそのまま出す。 */
export const Canceled: Story = {
  args: { purchase: { ...PURCHASE_DETAIL, statusName: "キャンセル" } },
};
