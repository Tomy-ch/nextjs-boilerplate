import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AdminSummarySkeleton } from "./skeleton";

const meta = {
  title: "Features/Admin/Skeleton",
  component: AdminSummarySkeleton,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "集計の待機表示です。数値カードの枠と、その下に続く帯の高さを出すため、",
          "描画された瞬間に下に置いたものの位置が動きません。",
          "表を待つ `Features/Admin/Products/List/Skeleton` や `Features/Admin/Users/Skeleton` とは",
          "枠の形が違い、こちらは行ではなくカードと帯で待ちます。",
          "入口と集計の両方が使うので、どちらの画面の名前も持ちません。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof AdminSummarySkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。広い段でカードが 4 枚横に並ぶ。 */
export const Default: Story = {};

/** 狭い段。カードが 2 枚ずつ 2 行に畳まれ、帯の位置が下がる。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};
