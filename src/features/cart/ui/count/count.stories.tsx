import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CartCount } from "./count";

const meta = {
  title: "Features/Cart/Count",
  component: CartCount,
  parameters: { layout: "centered" },
} satisfies Meta<typeof CartCount>;

export default meta;
type Story = StoryObj<typeof meta>;

/** カートに入っている状態。点数は行数であり、数量の合計ではない。 */
export const WithItems: Story = {
  args: { count: 2 },
};

/** 空の状態。数字を出さない。 */
export const Empty: Story = {
  args: { count: 0 },
};
