import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AdminInquiryDetailSkeleton } from "./skeleton";

const meta = {
  title: "Features/Admin/Inquiries/Detail/Skeleton",
  component: AdminInquiryDetailSkeleton,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "問い合わせ 1 件の待機表示です。吹き出しを左右交互に並べ、回答欄と同じ高さの枠を下に置きます。",
          "やり取りが届いても回答欄の位置は動きません。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof AdminInquiryDetailSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。 */
export const Default: Story = {};
