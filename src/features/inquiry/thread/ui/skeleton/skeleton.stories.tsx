import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { InquiryThreadSkeleton } from "./skeleton";

const meta = {
  title: "Features/Inquiry/Thread/Skeleton",
  component: InquiryThreadSkeleton,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "問い合わせの待機表示です。出来上がりと同じ高さの器を先に置き、吹き出しを左右交互に並べて",
          "送信欄の枠を下端に出します。やり取りが届いても送信欄の位置は動きません。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof InquiryThreadSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。 */
export const Default: Story = {};
