import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ProductListSkeleton } from "./product-list-skeleton";

const meta = {
  title: "Features/Products/ProductListSkeleton",
  component: ProductListSkeleton,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "取得を待っている間の表示です。並ぶものと同じ段組み・同じ形で枠だけを出すため、",
          "取得が終わった瞬間に位置が動きません。件数は実際の応答と一致しないので、",
          "枠の数は「画面が埋まる程度」以上の意味を持ちません。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof ProductListSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。 */
export const Default: Story = {};
