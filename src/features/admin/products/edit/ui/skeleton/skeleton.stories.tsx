import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AdminProductEditSkeleton } from "./skeleton";

const meta = {
  title: "Features/Admin/Products/Edit/Skeleton",
  component: AdminProductEditSkeleton,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "商品を編集する画面の待機表示です。観点の切り替え・入力欄の並び・送信を、",
          "出来上がりと同じ高さで出します。",
          "在庫を補充する `Features/Admin/Products/Stock/Skeleton` とは、",
          "先頭に観点の切り替えを持つ点が違います。",
          "欄の数は最初に開く観点と一致せず、フォームの形が伝わる以上の意味を持ちません。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof AdminProductEditSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。 */
export const Default: Story = {};
