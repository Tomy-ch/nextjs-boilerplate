import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PURCHASE_DETAIL, SINGLE_LINE_PURCHASE } from "../purchase.fixture";
import { PurchaseLineList } from "./lines";

const meta = {
  title: "Features/Purchases/LineList",
  component: PurchaseLineList,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "購入した明細です。単価は**購入した時点の値**で、商品名だけが現在の名称で解決されて届きます。",
          "行ごとの金額は出しません。掛け算をすると、画面が金額を作ることになります。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof PurchaseLineList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。名前の長い明細を含む。 */
export const Default: Story = {
  args: { lines: PURCHASE_DETAIL.lines },
};

/** 1 行だけの明細。 */
export const SingleLine: Story = {
  args: { lines: SINGLE_LINE_PURCHASE.lines },
};
