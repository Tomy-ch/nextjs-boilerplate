import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CartMatchStockButton } from "./match-stock-button";

const meta = {
  title: "Features/Cart/MatchStockButton",
  component: CartMatchStockButton,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "数量を、いま買える数まで下げる操作です。**在庫が足りない明細にだけ出ます** ——",
          "足りているうちは押しても結果が変わらず、在庫が 1 つも無い明細には合わせる先がありません。",
          "**カタログでは数量は変わりません。**",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof CartMatchStockButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 在庫が 2 個まで残っている明細。 */
export const Default: Story = {
  args: {
    availableQuantity: 2,
    label: "編組ケーブル 2m",
    productId: "0195f0c2-0000-7000-8000-000000000003",
  },
};

/** 在庫が 1 個の明細。合わせた結果が最小の数量になる。 */
export const SingleLeft: Story = {
  args: { ...Default.args, availableQuantity: 1 },
};
