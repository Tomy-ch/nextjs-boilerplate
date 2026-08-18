import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PurchaseDetailSkeleton } from "./skeleton";

const meta = {
  title: "Features/Purchases/DetailSkeleton",
  component: PurchaseDetailSkeleton,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "購入詳細の待機表示です。出来上がりと同じ段組みで枠だけを出し、読み始めた位置が動かないようにします。",
      },
    },
  },
} satisfies Meta<typeof PurchaseDetailSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。 */
export const Default: Story = {};
