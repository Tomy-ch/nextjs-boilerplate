import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AdminProductListSkeleton } from "./skeleton";

const meta = {
  title: "Features/Admin/Products/List/Skeleton",
  component: AdminProductListSkeleton,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "管理側の商品一覧の待機表示です。列見出しと行を同じ高さの枠で出すため、",
          "取得が終わった瞬間に下のページ送りの位置が動きません。",
          "行の数は実際の応答と一致せず、表の形が伝わる以上の意味を持ちません。",
          "同じ表の形で待つ `Features/Admin/Users/Skeleton` とは枠が同じで、待っている対象が違います。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof AdminProductListSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。列見出しの枠と 6 行分の枠が積まれる。 */
export const Default: Story = {};
