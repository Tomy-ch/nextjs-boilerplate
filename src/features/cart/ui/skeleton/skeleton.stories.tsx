import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CartSkeleton } from "./skeleton";

const meta = {
  title: "Features/Cart/Skeleton",
  component: CartSkeleton,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "カートの待機表示です。明細の行と小計の枠を実物と同じ高さで出し、届いた瞬間に位置が動かないようにします。",
      },
    },
  },
} satisfies Meta<typeof CartSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。 */
export const Default: Story = {};
