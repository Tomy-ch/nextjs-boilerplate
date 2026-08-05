import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Skeleton } from "./skeleton";

const meta = {
  title: "Status/Skeleton",
  component: Skeleton,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "読み込み中に、最終的な内容へ近い形を仮表示します。**形が予測できる場合にだけ使います。**",
          "実際と違う形を出すと、読み込み後に内容が飛んで読み手を失わせます。",
          "形が分からない短い処理は `Spinner`、進捗が測れないまま動き続けていることを示すなら",
          "`shimmer` を重ねます。`Skeleton` の脈動は「ここに箱がある」ことを、",
          "`shimmer` は「止まっていない」ことを示すので、長い処理では両方を使います。",
          "大きさは持たないため、`className` で最終的な内容に合わせた寸法を与えます。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof Skeleton>;
export default meta;
type Story = StoryObj<typeof meta>;

/** 見出しと本文が入る領域。行の長さを最終的な内容へ寄せる。 */
export const Content: Story = {
  render: () => (
    <div className="w-80 space-y-3">
      <Skeleton className="h-5 w-2/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  ),
};

/** 画像と本文が横に並ぶ領域。円形など形も最終的な内容に合わせる。 */
export const Media: Story = {
  render: () => (
    <div className="flex w-80 items-center gap-3">
      <Skeleton className="size-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  ),
};
