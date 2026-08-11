import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { type CartLineInput, useCartStore } from "@/stores/cart-store";

import { CartCount } from "./cart-count";

const LINE: CartLineInput = {
  productId: "0195f0c2-0000-7000-8000-000000000001",
  name: "ワイヤレスイヤホン",
  price: "19.99",
  statusName: "公開",
  imageUrl: null,
  stockQuantity: 12,
};

function seed(lines: readonly CartLineInput[]) {
  useCartStore.setState({ lines: [] });
  for (const line of lines) {
    useCartStore.getState().add(line);
  }
}

const meta = {
  title: "Features/Cart/CartCount",
  component: CartCount,
  parameters: { layout: "centered" },
} satisfies Meta<typeof CartCount>;

export default meta;
type Story = StoryObj<typeof meta>;

/** カートに入っている状態。点数は行数であり、数量の合計ではない。 */
export const WithItems: Story = {
  decorators: [
    (Story) => {
      seed([LINE, { ...LINE, productId: "other", name: "スマートウォッチ" }]);

      return <Story />;
    },
  ],
};

/** 空の状態。数字を出さない。 */
export const Empty: Story = {
  decorators: [
    (Story) => {
      seed([]);

      return <Story />;
    },
  ],
};
