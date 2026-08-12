import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CartQuantityStepper } from "./cart-quantity-stepper";

/** story では数量を保持しない。押せることと記号の切り替わりだけを見せる。 */
const noop = () => {};

const meta = {
  title: "Features/Cart/CartQuantityStepper",
  component: CartQuantityStepper,
  parameters: { layout: "centered" },
  args: { label: "ワイヤレスイヤホン", onChange: noop },
} satisfies Meta<typeof CartQuantityStepper>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。減らす・増やすの両方が使える。 */
export const Default: Story = {
  args: { max: 9, quantity: 3 },
};

/** 数量が 1 の場合。減らす操作を削除の記号にする。 */
export const RemovableQuantity: Story = {
  args: { max: 9, quantity: 1 },
};

/** 在庫の上限に達した場合。増やす操作を押せなくする。 */
export const AtMax: Story = {
  args: { max: 3, quantity: 3 },
};
