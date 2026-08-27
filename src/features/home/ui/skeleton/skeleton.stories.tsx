import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { HomeSkeleton } from "./skeleton";

const meta = {
  title: "Features/Home/Skeleton",
  component: HomeSkeleton,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "節ごとに違う形で枠を出します。3 つとも同じ枠にすると、",
          "出てきた瞬間に高さが変わってページ全体が跳ねます。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof HomeSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 取得を待っている状態。 */
export const Default: Story = {};
