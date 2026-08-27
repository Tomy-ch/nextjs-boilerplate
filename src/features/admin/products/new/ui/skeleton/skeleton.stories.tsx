import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AdminProductCreateSkeleton } from "./skeleton";

const meta = {
  title: "Features/Admin/Products/New/Skeleton",
  component: AdminProductCreateSkeleton,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "商品を作る画面の待機表示です。進捗・入力欄の並び・段を行き来する操作を、",
          "出来上がりと同じ高さで出します。",
          "編集の `Features/Admin/Products/Edit/Skeleton` とは先頭の枠が違い、",
          "こちらは観点の切り替えではなく段階の進捗を待ちます。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof AdminProductCreateSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。 */
export const Default: Story = {};
