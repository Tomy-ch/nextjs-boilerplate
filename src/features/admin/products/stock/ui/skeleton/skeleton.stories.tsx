import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AdminProductStockSkeleton } from "./skeleton";

const meta = {
  title: "Features/Admin/Products/Stock/Skeleton",
  component: AdminProductStockSkeleton,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "在庫を補充する画面の待機表示です。現在の在庫の枠・向きの選択・数量の欄・送信の並びを、",
          "出来上がりと同じ高さで出します。",
          "表を待つ `Features/Admin/Products/List/Skeleton` を流用しないのは、",
          "行が並んでからフォームが現れることになり、何を待っているかが伝わらないためです。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof AdminProductStockSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。 */
export const Default: Story = {};
