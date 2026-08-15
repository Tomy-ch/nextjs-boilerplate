import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CART, CART_WITHOUT_PURCHASABLE, EMPTY_CART } from "../../cart.fixture";
import { CartSummaryCard } from "./summary-card";

const meta = {
  title: "Features/Cart/SummaryCard",
  component: CartSummaryCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "小計と先へ進む導線です。器を持たず、広い幅では本文の脇に貼り付き、",
          "狭い幅では画面の下から出てくる引き出しの中に入ります。",
          "**小計はバックエンドが返す参考値**で、買える明細だけを合算したものです。",
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
} satisfies Meta<typeof CartSummaryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 買える明細がある状態。 */
export const Default: Story = {
  args: { cart: CART },
};

/** 買える明細が 1 つも無い状態。進む操作を押せなくし、理由を添える。 */
export const WithoutPurchasable: Story = {
  args: { cart: CART_WITHOUT_PURCHASABLE },
};

/** 空のカート。小計は 0 になる。 */
export const Empty: Story = {
  args: { cart: EMPTY_CART },
};
