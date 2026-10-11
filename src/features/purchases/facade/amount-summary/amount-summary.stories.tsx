import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  CAPPED_RATE_DISCOUNT_PURCHASE,
  PURCHASE_DETAIL,
  TOTAL_REFERENCE,
} from "../purchase.fixture";
import { PurchaseAmountSummary } from "./amount-summary";

const meta = {
  title: "Features/Purchases/AmountSummary",
  component: PurchaseAmountSummary,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "請求額の内訳です。**基準通貨の金額は常に出したまま**で、切り替えが足すのは参考の 1 行だけです。",
          "参考換算額を添えるのは合計にだけで、内訳のそれぞれには添えません。",
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
} satisfies Meta<typeof PurchaseAmountSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。円で見る操作を持つ。 */
export const Default: Story = {
  args: { purchase: PURCHASE_DETAIL, reference: TOTAL_REFERENCE },
};

/** 参考換算額を引けなかった状態。切り替えの操作ごと出さない。 */
export const WithoutReference: Story = {
  args: { purchase: PURCHASE_DETAIL, reference: null },
};

/** クーポンで値引きした購入。小計の次に、差し引いた額を負の符号で出す。 */
export const WithDiscount: Story = {
  args: { purchase: CAPPED_RATE_DISCOUNT_PURCHASE, reference: TOTAL_REFERENCE },
};

/** 値引きの行の直下に、画面が渡した中身を添える。 */
export const WithDiscountDetail: Story = {
  args: {
    purchase: CAPPED_RATE_DISCOUNT_PURCHASE,
    reference: TOTAL_REFERENCE,
    discountDetail: <p className="text-muted-foreground text-xs">画面が渡す値引きの中身</p>,
  },
};
