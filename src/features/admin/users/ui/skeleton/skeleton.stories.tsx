import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AdminUserListSkeleton } from "./skeleton";

const meta = {
  title: "Features/Admin/Users/Skeleton",
  component: AdminUserListSkeleton,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "利用者一覧の待機表示です。列見出しと行を同じ高さの枠で出すため、",
          "取得が終わった瞬間に下のページ送りの位置が動きません。",
          "行の数は実際の応答と一致せず、表の形が伝わる以上の意味を持ちません。",
          "商品を待つ `Features/Admin/Products/List/Skeleton` とは枠が同じで、待っている対象が違います。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof AdminUserListSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。列見出しの枠と 6 行分の枠が積まれる。 */
export const Default: Story = {};
