import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AdminProductDiscontinueSkeleton } from "./skeleton";

const meta = {
  title: "Features/Admin/Products/Discontinue/Skeleton",
  component: AdminProductDiscontinueSkeleton,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "廃番の画面の待機表示です。実行の入口が出るか残っている購入が並ぶかは約束せず、見積もりの枠と続く領域の高さだけを示します。",
      },
    },
  },
} satisfies Meta<typeof AdminProductDiscontinueSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 広い幅。 */
export const Default: Story = {};

/** 狭い幅。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};
